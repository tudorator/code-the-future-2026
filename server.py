from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from database import save_sensor_data, get_average_humidity, get_average_distance, get_average_gas, get_average_temperature

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/data', methods=['POST'])
def receive_esp_data():
    data = request.json
    print(f"Received from ESP32: {data}")
    
    # Save to database
    save_sensor_data(data['humidity'], data['distance_cm'], data['gas_ppm'], data.get('temperature'))
    
    # Send to website
    socketio.emit('sensor_update', data)
    
    return jsonify({"status": "success"}), 200

@app.route('/averages', methods=['GET'])
def get_averages():  
    print("📊 /averages endpoint called", flush=True)
    averages = {
        "average_humidity":    round(get_average_humidity()    or 0, 2),
        "average_distance":    round(get_average_distance()    or 0, 2),
        "average_gas":         round(get_average_gas()         or 0, 2),
        "average_temperature": round(get_average_temperature() or 0, 2)
    }
    print(f"Averages sent to website: {averages}", flush=True)
    return jsonify(averages), 200

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)