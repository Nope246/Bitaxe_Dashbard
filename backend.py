from flask import Flask, jsonify, request, send_from_directory
import threading
import requests
from concurrent.futures import ThreadPoolExecutor
import os

app = Flask(__name__)

# CONFIGURATION
SUBNET = "192.168.1."        # Adjust for your network
API_ENDPOINT = "/api/system/info"
MAX_THREADS = 255
IP_LIST_FILE = 'bitaxe_ip_list.txt'

# Thread-safe device list
devices = []
devices_lock = threading.Lock()

def load_target_ips():
    """Load the current list of target IPs from file."""
    if not os.path.exists(IP_LIST_FILE):
        return []
    with open(IP_LIST_FILE, 'r') as f:
        return [line.strip() for line in f if line.strip()]

def scan_ip(ip):
    """Query a device for its status."""
    url = f"http://{ip}{API_ENDPOINT}"
    try:
        resp = requests.get(url, timeout=2)
        if resp.status_code == 200:
            data = resp.json()
            device_info = {
                "hostname": data.get("hostname", "N/A"),
                "ip": ip,
                "hashrate": data.get("hashRate", "N/A"),
                "temp": data.get("temp", "N/A"),
                "fan": data.get("fanspeed", "N/A"),
                "bestDiff": data.get("bestDiff", "N/A"),
                "bestSessionDiff": data.get("bestSessionDiff", "N/A"),
                "version": data.get("version", "N/A"),
                "uptime": data.get("uptimeSeconds", "N/A"),
                "ASICModel": data.get("ASICModel", "N/A"),
                "sharesAccepted": data.get("sharesAccepted", "N/A"),
                "sharesRejected": data.get("sharesRejected", "N/A")
            }
            with devices_lock:
                devices.append(device_info)
    except requests.RequestException:
        # Silently ignore unreachable devices
        pass

@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Return a list of devices based on IP list or subnet scan."""
    global devices
    devices = []
    mode = request.args.get('mode', 'list')

    if mode == 'scan':
        ip_range = [f"{SUBNET}{i}" for i in range(1, 255)]
    else:
        ip_range = load_target_ips()

    with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        futures = [executor.submit(scan_ip, ip) for ip in ip_range]
        for future in futures:
            future.result()

    return jsonify(devices)

@app.route('/api/restart', methods=['POST'])
def restart_device():
    """Send a restart command to a device."""
    ip = request.json.get('ip')
    if not ip:
        return jsonify({"error": "Missing 'ip' in request."}), 400

    try:
        resp = requests.post(f"http://{ip}/api/system/restart", timeout=2)
        if resp.status_code == 200:
            return jsonify({"message": f"Device {ip} restarted successfully."})
        else:
            return jsonify({"error": f"Failed to restart device {ip}."}), 400
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ip-list', methods=['GET'])
def get_ip_list():
    """Return the current IP list."""
    return jsonify(load_target_ips())

@app.route('/api/ip-list', methods=['POST'])
def save_ip_list():
    """Update the IP list."""
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({"error": "Invalid data format. Expected a JSON list."}), 400

    try:
        with open(IP_LIST_FILE, 'w') as f:
            for ip in data:
                f.write(f"{ip}\n")
        return jsonify({"message": "IP list saved."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Serve index.html at root
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# Serve other static files (JS, CSS, etc.)
@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
