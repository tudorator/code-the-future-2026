from flask import Flask, request, jsonify, Response
import json
import time

app = Flask(__name__)

latest_data = {
    "temperature": 0,
    "pressure": 0,
    "humidity": 0
}

# ESP32 sends data here
@app.route('/data', methods=['POST'])
def receive_data():
    global latest_data
    latest_data = request.json
    print(f"Received: {latest_data}")
    return jsonify({"status": "OK"})

# Frontend listens here for live updates
@app.route('/stream')
def stream():
    def generate():
        while True:
            yield f"data: {json.dumps(latest_data)}\n\n"
            time.sleep(1)
    return Response(generate(), mimetype='text/event-stream')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)