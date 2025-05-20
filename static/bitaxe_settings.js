

// Load existing IPs into the table
async function loadIPs() {
    const res = await fetch('/api/ip-list');
    const ips = await res.json();
    const tbody = document.getElementById('ipTableBody');
    tbody.innerHTML = '';
    ips.forEach(ip => addRow(ip));
}

// Add a row to the IP list table
function addRow(ip = '') {
    const tbody = document.getElementById('ipTableBody');
    const row = document.createElement('tr');

    const ipCell = document.createElement('td');
    const ipInput = document.createElement('input');
    ipInput.type = 'text';
    ipInput.value = ip;
    ipInput.classList.add('ip-input');
    ipCell.appendChild(ipInput);

    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑 Delete';
    deleteBtn.onclick = () => row.remove();
    actionCell.appendChild(deleteBtn);

    row.appendChild(ipCell);
    row.appendChild(actionCell);
    tbody.appendChild(row);
}

// Save the IP list to the backend
async function saveIPs() {
    const rows = document.querySelectorAll('#ipTableBody tr');
    const ips = Array.from(rows).map(row => row.querySelector('input').value.trim()).filter(ip => ip !== '');
    const res = await fetch('/api/ip-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ips)


    });
    alert(res.ok ? 'IP list saved!' : 'Failed to save IP list.');
}

/*
// Load the saved network IP prefix
async function loadIPPrefix() {
    const res = await fetch('/api/ip-prefix');
    const prefix = await res.json();
    document.getElementById('ipPrefix').value = prefix;
}

// Save the network IP prefix
async function saveIPPrefix() {
    const prefix = document.getElementById('ipPrefix').value.trim();
    const res = await fetch('/api/ip-prefix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix })
    });
    alert(res.ok ? 'IP Prefix saved!' : 'Failed to save IP Prefix.');
}
*/
/*
// Save the dashboard refresh and scan mode settings to localStorage
function saveDashboardSettings() {
    const interval = document.getElementById('refreshIntervalSelect').value;
    const scanMode = document.getElementById('scanModeSelect').value;
    localStorage.setItem('dashboardRefreshInterval', interval);
    localStorage.setItem('dashboardScanMode', scanMode);
    alert(' saved!');
}
*/
/*
// Load the saved dashboard settings from localStorage
function loadSavedDashboardSettings() {
    const savedInterval = localStorage.getItem('dashboardRefreshInterval') || '30000';
    const savedScanMode = localStorage.getItem('dashboardScanMode') || 'list';
    document.getElementById('refreshIntervalSelect').value = savedInterval;
    document.getElementById('scanModeSelect').value = savedScanMode;
}
*/
// Load all settings when the page loads


window.onload = function() {
    loadIPs();
    //loadSavedDashboardSettings();
    //loadIPPrefix();
};
