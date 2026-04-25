#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "esp_http_client.h" // <-- Back to HTTP Client
#include "driver/gpio.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_timer.h"
#include "rom/ets_sys.h" 

#define WIFI_SSID      "Mi MIX 2S"
#define WIFI_PASS      "7481D986"

// 🚨 UPDATE THIS TO YOUR LAPTOP'S IP ADDRESS!
#define SERVER_URL     "http://192.168.X.X:5000/update" 

#define MQ3_ADC_CHAN   ADC_CHANNEL_2 
#define TRIG_PIN       GPIO_NUM_18
#define ECHO_PIN       GPIO_NUM_19
#define DHT_GPIO       GPIO_NUM_7
#define MAX_TIMINGS    85

static EventGroupHandle_t s_wifi_event_group;
#define WIFI_CONNECTED_BIT BIT0
static const char *TAG = "SPLATSCAPE_NODE";

adc_oneshot_unit_handle_t adc1_handle;

volatile float real_temperature = 0.0;
volatile float real_humidity = 0.0;
volatile float real_distance = -1.0;
volatile int real_gas = 0;

static portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

// --- 1. SENSOR INIT ---
void init_sensors() {
    adc_oneshot_unit_init_cfg_t init_config1 = { .unit_id = ADC_UNIT_1 };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&init_config1, &adc1_handle));
    adc_oneshot_chan_cfg_t config = { .bitwidth = ADC_BITWIDTH_DEFAULT, .atten = ADC_ATTEN_DB_12 };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc1_handle, MQ3_ADC_CHAN, &config));

    gpio_set_direction(TRIG_PIN, GPIO_MODE_OUTPUT);
    gpio_set_direction(ECHO_PIN, GPIO_MODE_INPUT);
    gpio_set_level(TRIG_PIN, 0);
}

// --- 2. RAW DHT22 DRIVER ---
int read_dht22_raw(float *humidity, float *temperature) {
    int data[5] = {0, 0, 0, 0, 0};
    uint8_t last_state = 1, counter = 0, j = 0;

    gpio_set_direction(DHT_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(DHT_GPIO, 0);
    vTaskDelay(pdMS_TO_TICKS(20)); 
    gpio_set_level(DHT_GPIO, 1);
    esp_rom_delay_us(40);
    gpio_set_direction(DHT_GPIO, GPIO_MODE_INPUT);

    portENTER_CRITICAL(&mux); 
    for (int i = 0; i < MAX_TIMINGS; i++) {
        counter = 0;
        while (gpio_get_level(DHT_GPIO) == last_state) {
            counter++; esp_rom_delay_us(1);
            if (counter == 255) break;
        }
        last_state = gpio_get_level(DHT_GPIO);
        if (counter == 255) break;
        if ((i >= 4) && (i % 2 == 0)) {
            data[j / 8] <<= 1;
            if (counter > 40) data[j / 8] |= 1; 
            j++;
        }
    }
    portEXIT_CRITICAL(&mux); 

    if ((j >= 40) && (data[4] == ((data[0] + data[1] + data[2] + data[3]) & 0xFF))) {
        *humidity = (data[0] * 256 + data[1]) / 10.0;
        float t = ((data[2] & 0x7F) * 256 + data[3]) / 10.0;
        if (data[2] & 0x80) t *= -1.0; 
        *temperature = t;
        return 1; 
    }
    return 0; 
}

void dht_task(void *pvParameters) {
    vTaskDelay(pdMS_TO_TICKS(2000)); 
    while (1) {
        float temp = 0, hum = 0;
        if (read_dht22_raw(&hum, &temp)) {
            real_temperature = temp - 2.5; 
            real_humidity = hum;
        }
        vTaskDelay(pdMS_TO_TICKS(10000)); 
    }
}

// --- 3. FAST SENSOR TASK ---
float read_distance_cm() {
    gpio_set_level(TRIG_PIN, 0); esp_rom_delay_us(2);
    gpio_set_level(TRIG_PIN, 1); esp_rom_delay_us(10);
    gpio_set_level(TRIG_PIN, 0);

    int64_t start_time = esp_timer_get_time();
    while (gpio_get_level(ECHO_PIN) == 0) if (esp_timer_get_time() - start_time > 30000) return -1; 
    start_time = esp_timer_get_time();
    while (gpio_get_level(ECHO_PIN) == 1) if (esp_timer_get_time() - start_time > 30000) return -1;
    
    return (esp_timer_get_time() - start_time) * 0.0343 / 2.0;
}

void fast_sensor_task(void *pvParameters) {
    while(1) {
        int raw_val = 0, gas_total = 0;
        for(int i = 0; i < 10; i++) {
            adc_oneshot_read(adc1_handle, MQ3_ADC_CHAN, &raw_val);
            gas_total += raw_val;
            vTaskDelay(pdMS_TO_TICKS(5)); 
        }
        real_gas = gas_total / 10;

        float d1 = read_distance_cm(); vTaskDelay(pdMS_TO_TICKS(60)); 
        float d2 = read_distance_cm(); vTaskDelay(pdMS_TO_TICKS(60)); 
        float d3 = read_distance_cm(); 
        
        float median = d1;
        if ((d1 > d2 && d1 < d3) || (d1 < d2 && d1 > d3)) median = d1;
        else if ((d2 > d1 && d2 < d3) || (d2 < d1 && d2 > d3)) median = d2;
        else median = d3;

        real_distance = median;
        vTaskDelay(pdMS_TO_TICKS(150)); 
    }
}

// --- 4. NETWORK POST TASK (Replaces Web Server) ---
void send_data_task(void *pvParameters) {
    while(1) {
        char post_data[256];
        snprintf(post_data, sizeof(post_data), 
                 "{\"humidity\": %.1f, \"distance_cm\": %.1f, \"gas_ppm\": %d, \"temperature\": %.1f}", 
                 real_humidity, real_distance, real_gas, real_temperature);

        esp_http_client_config_t config = {
            .url = SERVER_URL,
            .method = HTTP_METHOD_POST,
        };
        esp_http_client_handle_t client = esp_http_client_init(&config);
        esp_http_client_set_header(client, "Content-Type", "application/json");
        esp_http_client_set_post_field(client, post_data, strlen(post_data));
        
        esp_http_client_perform(client);
        esp_http_client_cleanup(client);

        vTaskDelay(pdMS_TO_TICKS(500)); // Post twice a second
    }
}

// --- 5. WIFI INIT ---
static void event_handler(void* arg, esp_event_base_t event_base, int32_t event_id, void* event_data) {
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) esp_wifi_connect();
    else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        esp_wifi_connect();
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
        ESP_LOGI(TAG, "Wi-Fi Connected!");
    }
}

void wifi_init_sta(void) {
    s_wifi_event_group = xEventGroupCreate();
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &event_handler, NULL, NULL);
    esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &event_handler, NULL, NULL);

    wifi_config_t wifi_config = { .sta = { .ssid = WIFI_SSID, .password = WIFI_PASS } };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
}

void app_main(void) {
    vTaskDelay(pdMS_TO_TICKS(5000));
    ESP_LOGI(TAG, "Booting Splatscape Node (Client Mode)...");

    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
      ESP_ERROR_CHECK(nvs_flash_erase()); ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    
    init_sensors();
    wifi_init_sta();

    xTaskCreate(&dht_task, "dht_task", 4096, NULL, 5, NULL);
    xTaskCreate(&fast_sensor_task, "fast_sensor", 4096, NULL, 5, NULL);

    EventBits_t bits = xEventGroupWaitBits(s_wifi_event_group, WIFI_CONNECTED_BIT, pdFALSE, pdFALSE, portMAX_DELAY);
    if (bits & WIFI_CONNECTED_BIT) {
        // Start the POST task instead of a web server
        xTaskCreate(&send_data_task, "send_data", 4096, NULL, 5, NULL);
    }
}