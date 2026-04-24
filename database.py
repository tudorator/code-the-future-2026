import sqlite3
from datetime import datetime

def init_db():
    conn = sqlite3.connect('sensor_data.db')
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        humidity REAL,
        distance_cm INTEGER,
        gas_ppm INTEGER,
        temperature REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Add temperature column if it doesn't exist (migration)
    c.execute("PRAGMA table_info(sensor_readings)")
    columns = [col[1] for col in c.fetchall()]
    if 'temperature' not in columns:
        c.execute("ALTER TABLE sensor_readings ADD COLUMN temperature REAL")
    
    conn.commit()
    conn.close()
    print("✅ Database initialized")

def save_sensor_data(humidity, distance_cm, gas_ppm, temperature):
    conn = sqlite3.connect('sensor_data.db')
    c = conn.cursor()
    c.execute("INSERT INTO sensor_readings (humidity, distance_cm, gas_ppm, temperature) VALUES (?, ?, ?, ?)",
              (humidity, distance_cm, gas_ppm, temperature))
    conn.commit()
    conn.close()

def get_average_humidity():
    conn = sqlite3.connect('sensor_data.db')
    c = conn.cursor()
    c.execute("SELECT AVG(humidity) FROM sensor_readings")
    avg = c.fetchone()[0]
    conn.close()
    return avg if avg else 0

def get_average_temperature():
    conn = sqlite3.connect('sensor_data.db')
    c = conn.cursor()
    c.execute("SELECT AVG(temperature) FROM sensor_readings")
    avg = c.fetchone()[0]
    conn.close()
    return avg if avg else 0

def get_average_distance():
    conn = sqlite3.connect('sensor_data.db')
    c = conn.cursor()
    c.execute("SELECT AVG(distance_cm) FROM sensor_readings")
    avg = c.fetchone()[0]
    conn.close()
    return avg if avg else 0

def get_average_gas():
    conn = sqlite3.connect('sensor_data.db')
    c = conn.cursor()
    c.execute("SELECT AVG(gas_ppm) FROM sensor_readings")
    avg = c.fetchone()[0]
    conn.close()
    return avg if avg else 0

# Initialize on import
init_db()