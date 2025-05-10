let refreshIntervalId;

function loadDevices() {
    const tbody = document.querySelector('#devices tbody');
    tbody.innerHTML = '<tr><td colspan="8">Loading devices... Please wait...</td></tr>';

   const mode = document.getElementById('scanMode').value;



    fetch(`/api/devices?mode=${mode}`)
        .then(res => res.json())
        .then(devices => {
            devices.sort((a, b) => a.hostname.localeCompare(b.hostname));
            tbody.innerHTML = '';

            let totalHashrate = 0;

            if (devices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="color:yellow;">No devices found.</td></tr>';
                return;
            }

            devices.forEach(device => {
                const row = document.createElement('tr');
                const hostnameCell = document.createElement('td');
                hostnameCell.textContent = device.hostname;

                if (device.hostname?.startsWith('s') || device.hostname?.startsWith('S')) {
                    hostnameCell.style.color = 'green';
                } else if (device.hostname?.startsWith('c')) {
                    hostnameCell.style.color = 'cyan';
                }
                row.appendChild(hostnameCell);

                const ipCell = document.createElement('td');
                const ipLink = document.createElement('a');
                ipLink.href = `http://${device.ip}`;
                ipLink.textContent = device.ip;
                ipLink.target = '_blank';
                ipCell.appendChild(ipLink);
                row.appendChild(ipCell);

                row.appendChild(makeCell(device.bestDiff));

                const hashrate = parseFloat(device.hashrate);
                totalHashrate += !isNaN(hashrate) ? hashrate : 0;
                row.appendChild(makeCell(!isNaN(hashrate) ? hashrate.toFixed(2) : 'N/A'));

                const temp = parseFloat(device.temp);
                const tempCell = makeCell(!isNaN(temp) ? temp.toFixed(2) : 'N/A');
                if (temp > 65) tempCell.classList.add('flash-red');
                row.appendChild(tempCell);

                const fan = parseFloat(device.fan);
                const fanCell = makeCell(!isNaN(fan) ? fan.toFixed(2) : 'N/A');
                if (fan > 95) fanCell.classList.add('flash-red');
                row.appendChild(fanCell);

                row.appendChild(makeCell(device.version));

                // Convert uptimeSeconds to Days, Hours, Minutes
                const uptimeSeconds = parseInt(device.uptime);
                let uptimeDisplay = 'N/A';
                if (!isNaN(uptimeSeconds)) {
                const days = Math.floor(uptimeSeconds / 86400);
                const hours = Math.floor((uptimeSeconds % 86400) / 3600);
                const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                uptimeDisplay = `${days}d ${hours}h ${minutes}m`;
                    }
                row.appendChild(makeCell(uptimeDisplay));
                

                const actionCell = document.createElement('td');
                const btn = document.createElement('button');
                btn.textContent = 'Restart';
                btn.classList.add('outline');
                btn.onclick = () => restartDevice(device.ip);
                actionCell.appendChild(btn);
                row.appendChild(actionCell);

                tbody.appendChild(row);
            });

            const terahash = totalHashrate / 1000;
            document.getElementById('total').textContent = `Total Hashrate: ${terahash.toFixed(2)} TH`;
            document.getElementById('last-updated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        })
        .catch(err => {
            console.error('Error loading devices: ' + err);
            tbody.innerHTML = '<tr><td colspan="8" style="color:red;">Failed to load devices</td></tr>';
        });
}

function makeCell(content) {
    const cell = document.createElement('td');
    cell.textContent = content;
    return cell;
}

function restartDevice(ip) {
    fetch('/api/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
    })
    .then(res => res.json())
    .then(resp => {
        if (resp.error) alert('Error: ' + resp.error);
        else alert(resp.message);
    })
    .catch(err => alert('Error restarting device: ' + err));
}

function startAutoRefresh(intervalMs) {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(loadDevices, intervalMs);
}

function exportToCSV() {
    const rows = document.querySelectorAll('#devices tr');
    let csvContent = '';

    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = Array.from(cols).map(col => `"${col.textContent.trim()}"`).join(',');
        csvContent += rowData + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bitaxe_devices.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


document.addEventListener('DOMContentLoaded', function() {
    const savedInterval = localStorage.getItem('dashboardRefreshInterval');
    const savedScanMode = localStorage.getItem('dashboardScanMode');

    if (savedInterval) document.getElementById('refreshInterval').value = savedInterval;
    if (savedScanMode) document.getElementById('scanMode').value = savedScanMode;

    document.getElementById('refreshInterval').addEventListener('change', function() {
        startAutoRefresh(parseInt(this.value));
    });

    loadDevices();
    startAutoRefresh(parseInt(document.getElementById('refreshInterval').value));
});
