# backend.py

from flask import Flask, jsonify, request, send_from_directory
import threading
import requests
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)

def load_target_ips(filename='bitaxe_ip_list.txt'):
    with open(filename) as f:
        return [line.strip() for line in f if line.strip()]


# CONFIGURATION
SUBNET = "192.168.1."  # Change to match your network
API_ENDPOINT = "/api/system/info"
MAX_THREADS = 255        # Limit concurrent threads

# GLOBAL DEVICE LIST
devices = []
devices_lock = threading.Lock()  # For thread-safe updates

def scan_ip(ip):
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
                "version": data.get("version", "N/A"),
                "uptime": data.get("uptimeSeconds", "N/A"),




                
            }
            with devices_lock:
                devices.append(device_info)
    except requests.RequestException:
        # Ignore offline devices or unreachable hosts
        pass

TARGET_IPS = load_target_ips()

@app.route('/api/devices', methods=['GET'])
def get_devices():
    global devices
    devices = []
    mode = request.args.get('mode', 'list')  # 'list' or 'scan'

    if mode == 'scan':
        ip_range = [f"{SUBNET}{i}" for i in range(1, 255)]
    else:
        ip_range = TARGET_IPS

    with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        futures = [executor.submit(scan_ip, ip) for ip in ip_range]
        for future in futures:
            future.result()
    return jsonify(devices)

@app.route('/api/restart', methods=['POST'])
def restart_device():
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

# Pull in the bitaxe_ip_list.txt


IP_LIST_FILE = 'bitaxe_ip_list.txt'

IP_LIST_FILE = 'bitaxe_ip_list.txt'

@app.route('/api/ip-list', methods=['GET'])
def get_ip_list():
    try:
        with open(IP_LIST_FILE, 'r') as f:
            ips = [line.strip() for line in f if line.strip()]
        return jsonify(ips)
    except FileNotFoundError:
        return jsonify([])

@app.route('/api/ip-list', methods=['POST'])
def save_ip_list():
    ips = request.get_json()
    try:
        with open(IP_LIST_FILE, 'w') as f:
            for ip in ips:
                f.write(f"{ip}\n")
        return jsonify({"message": "IP list saved."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)