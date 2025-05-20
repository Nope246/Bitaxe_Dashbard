let refreshIntervalId;

async function loadDevices() {

    loadDashboardInfo()

    const tbody = document.querySelector('#devices tbody');
    showStatus(tbody, 'Loading devices... Please wait...', 'info');

    const mode = document.getElementById('scanMode').value;

    try {
        const devicesRes = await fetch(`/api/devices?mode=${mode}`);
        const devices = await devicesRes.json();
        console.info('[Bitaxe Dashboard] Loaded devices:', devices);
        renderDevices(devices);
    } catch (error) {
        console.error('[Bitaxe Dashboard] Failed to load devices:', error);
        showStatus(tbody, 'Failed to load devices', 'error');
    }
}

function renderDevices(devices) {

    const tbody = document.querySelector('#devices tbody');
    tbody.innerHTML = '';
    let totalHashrate = 0;

    if (devices.length === 0) {
        showStatus(tbody, 'No devices found.', 'warning');
        return;
    }

    devices.sort((a, b) => a.hostname.localeCompare(b.hostname));

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

        const bestDiffCell = makeCell(`
            <div class="tooltip">${device.bestDiff}<div class="tooltip-content">All Time Best</div></div>
            <br>
            <div class="tooltip2" style="font-size: 0.7em; color: #ccc;">${device.bestSessionDiff}<div class="tooltip-content">Current Session</div></div>
        `);
        row.appendChild(bestDiffCell);

        const hashrate = parseFloat(device.hashrate);
        totalHashrate += !isNaN(hashrate) ? hashrate : 0;
        row.appendChild(makeCell(!isNaN(hashrate) ? hashrate.toFixed(2) : 'N/A'));

        const sharesAccepted = Number(device.sharesAccepted).toLocaleString();
        const sharesRejected = Number(device.sharesRejected).toLocaleString();

        const sharesCell = makeCell(`
            <div class="tooltip">${sharesAccepted}<div class="tooltip-content">Total Shares Accepted</div></div>
            <br>
            <div class="tooltip2" style="font-size: 0.7em; color: #ccc;">${sharesRejected}<div class="tooltip-content">Total Shares Rejected</div></div>
             `);
        row.appendChild(sharesCell);


        const temp = parseFloat(device.temp);
        const tempCell = makeCell(!isNaN(temp) ? temp.toFixed(2) : 'N/A');
        if (temp > 65) tempCell.classList.add('flash-red');
        row.appendChild(tempCell);

        const fan = parseFloat(device.fan);
        const fanCell = makeCell(!isNaN(fan) ? `${fan.toFixed(0)}%` : 'N/A');
        if (fan > 95) fanCell.classList.add('flash-red');
        row.appendChild(fanCell);

        const versionCell = makeCell(`
            <div style="font-weight: bold;">${device.version}</div>
            <div class="tooltip2" style="font-size: 0.7em; color: #ccc;">${device.ASICModel}<div class="tooltip-content">Model</div></div>
        `);
        row.appendChild(versionCell);

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
        btn.onclick = () => {
            btn.disabled = true;
            restartDevice(device.ip).finally(() => {
                btn.disabled = false;
            });
        };
        actionCell.appendChild(btn);
        row.appendChild(actionCell);

        tbody.appendChild(row);
    });

    const terahash = totalHashrate / 1000;
    document.getElementById('total').textContent = `Total Hashrate: ${terahash.toFixed(2)} TH`;
    document.getElementById('last-updated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}

function makeCell(content) {
    const cell = document.createElement('td');
    if (typeof content === 'string' && content.trim().startsWith('<')) {
        cell.innerHTML = content;
    } else {
        cell.textContent = content;
    }
    return cell;
}

function restartDevice(ip) {
    return fetch('/api/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
    })
    .then(res => res.json())
    .then(resp => {
        if (resp.error) {
            console.error('[Bitaxe Dashboard] Restart failed:', resp.error);
            showStatus(document.querySelector('#devices tbody'), 'Error: ' + resp.error, 'error');
        } else {
            console.info('[Bitaxe Dashboard] ' + resp.message);
        }
    })
    .catch(err => {
        console.error('[Bitaxe Dashboard] Restart error:', err);
        showStatus(document.querySelector('#devices tbody'), 'Error restarting device: ' + err, 'error');
    });
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

function showStatus(tbody, message, type = 'info') {
    let color = 'black';
    if (type === 'error') color = 'red';
    else if (type === 'warning') color = 'yellow';
    else if (type === 'info') color = 'gray';
    tbody.innerHTML = `<tr><td colspan="10" style="color:${color};">${message}</td></tr>`;
}



document.addEventListener('DOMContentLoaded', function() {
    // Load and apply saved settings
    const savedInterval = localStorage.getItem('dashboardRefreshInterval');
    const savedScanMode = localStorage.getItem('dashboardScanMode');

    if (savedInterval) document.getElementById('refreshInterval').value = savedInterval;
    if (savedScanMode) document.getElementById('scanMode').value = savedScanMode;

    // Bind change event for refresh interval
    document.getElementById('refreshInterval').addEventListener('change', function() {
        const value = parseInt(this.value);
        localStorage.setItem('dashboardRefreshInterval', value);
        startAutoRefresh(value);
    });

    // Bind change event for scan mode
    document.getElementById('scanMode').addEventListener('change', function() {
        localStorage.setItem('dashboardScanMode', this.value);
        loadDevices();
    });

    // Initial load of device data and dashboard info
    loadDevices();
    loadDashboardInfo();

    // Start auto refresh with saved or default value
    startAutoRefresh(parseInt(document.getElementById('refreshInterval').value));
});



// add the BTC Price

async function loadBitcoinPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await response.json();

    const rawPrice = data.bitcoin.usd; // This is the raw price as a number
    const formattedPrice = rawPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    document.getElementById('btc-price').innerText = formattedPrice;

    const satsPerUsd = Math.floor(100000000 / rawPrice).toLocaleString('en-US');
    document.getElementById('sats-per-usd').innerText = satsPerUsd + ' sats/USD';
  } 
  catch (error) {
    console.error('Failed to load Bitcoin price:', error);
    document.getElementById('btc-price').innerText = 'Fuck...';
    document.getElementById('sats-per-usd').innerText = 'Fuck...';
  }
}


// add block height
async function loadBlockHeight() {
  try {
    const response = await fetch('https://blockstream.info/api/blocks/tip/height');
    const blockHeight = await response.text();
    document.getElementById('block-height').innerText = blockHeight;
  } catch (error) {
    console.error('Failed to load block height:', error);
    document.getElementById('block-height').innerText = 'Unavailable';
  }
}

// loading device info

function loadDashboardInfo() {
  loadBitcoinPrice();
  loadBlockHeight();
}

