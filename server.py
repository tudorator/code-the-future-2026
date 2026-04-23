from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/data', methods=['POST'])
def receive_esp_data():
    data = request.json
    print(f"Received from ESP32: {data}")
    
    socketio.emit('sensor_update', data)
    
    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)