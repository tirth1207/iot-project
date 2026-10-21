(function () {
  'use strict';

  const config = window.DASHBOARD_CONFIG;
  const elements = {
    alert: document.getElementById('alert'),
    alertIcon: document.getElementById('alert-icon'),
    alertText: document.getElementById('alert-text'),
    mode: document.getElementById('mode'),
    refresh: document.getElementById('refresh'),
    connection: document.getElementById('connection'),
    level: document.getElementById('level'),
    tankFill: document.getElementById('tank-fill'),
    tankLabel: document.getElementById('tank-label'),
    status: document.getElementById('status'),
    depth: document.getElementById('depth'),
    distance: document.getElementById('distance'),
    updated: document.getElementById('updated'),
    sourceStatus: document.getElementById('source-status'),
    history: document.getElementById('history-list')
  };
  const demoReadings = {
    demo: { field1: '18.5', field2: '62', field3: '75.0', field4: '1', created_at: new Date().toISOString() },
    empty: { field1: '145.0', field2: '8', field3: '10.0', field4: '0', created_at: new Date().toISOString() },
    full: { field1: '6.0', field2: '93', field3: '112.0', field4: '2', created_at: new Date().toISOString() },
    stale: { field1: '60.0', field2: '55', field3: '50.0', field4: '1', created_at: new Date(Date.now() - config.staleDataTimeoutMs - 60000).toISOString() }
  };
  let history = [];

  function number(value, min, max) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
  }

  function normalize(entry) {
    if (!entry || !entry.created_at) throw new Error('Missing timestamp');
    const level = number(entry.field2, 0, 100);
    const depth = number(entry.field3, 0, Number.MAX_SAFE_INTEGER);
    const distance = number(entry.field1, 0, Number.MAX_SAFE_INTEGER);
    const sourceStatus = number(entry.field4, 0, 2);
    if (level === null || depth === null || distance === null || sourceStatus === null) {
      throw new Error('Missing or invalid sensor fields');
    }
    const timestamp = new Date(entry.created_at);
    if (Number.isNaN(timestamp.getTime())) throw new Error('Invalid timestamp');
    return { level, depth, distance, sourceStatus, timestamp };
  }

  function thresholdStatus(level) {
    if (level <= config.emptyThresholdPercent) return 'EMPTY';
    if (level >= config.overflowRiskThresholdPercent) return 'FULL/OVERFLOW_RISK';
    return 'NORMAL';
  }

  function statusInfo(reading) {
    if (Date.now() - reading.timestamp.getTime() > config.staleDataTimeoutMs) {
      return { key: 'stale', label: 'STALE DATA', message: 'Sensor data is outdated. Check the ESP32 connection.', icon: '⚠' };
    }
    const label = thresholdStatus(reading.level);
    if (label === 'EMPTY') return { key: 'empty', label, message: 'Alert: Tank is empty. Please refill the tank.', icon: '⚠' };
    if (label === 'FULL/OVERFLOW_RISK') return { key: 'full', label, message: 'Warning: Tank is nearly full. Check the water supply to prevent overflow.', icon: '⚠' };
    return { key: 'normal', label, message: 'Tank water level is normal.', icon: '✓' };
  }

  function renderError(message) {
    elements.alert.className = 'alert error';
    elements.alertIcon.textContent = '✕';
    elements.alertText.textContent = message || 'Unable to obtain a valid sensor reading.';
    elements.status.textContent = 'Status: SENSOR/DATA ERROR';
    elements.connection.textContent = 'Connection error';
    elements.level.textContent = '--';
    elements.tankFill.style.height = '0%';
    elements.tankLabel.textContent = 'No reading';
    elements.depth.textContent = '--';
    elements.distance.textContent = '--';
    elements.updated.textContent = '--';
    elements.sourceStatus.textContent = '--';
  }

  function render(reading) {
    const info = statusInfo(reading);
    elements.alert.className = 'alert ' + info.key;
    elements.alertIcon.textContent = info.icon;
    elements.alertText.textContent = info.message;
    elements.status.textContent = 'Status: ' + info.label;
    elements.level.textContent = reading.level.toFixed(0);
    elements.tankFill.style.height = reading.level + '%';
    elements.tankLabel.textContent = reading.level.toFixed(0) + '% full';
    elements.depth.textContent = reading.depth.toFixed(1);
    elements.distance.textContent = reading.distance.toFixed(1);
    elements.updated.textContent = reading.timestamp.toLocaleString();
    elements.sourceStatus.textContent = reading.sourceStatus;
    elements.connection.textContent = info.key === 'stale' ? 'Stale reading' : 'Reading received';
    history.unshift(reading);
    history = history.slice(0, 5);
    elements.history.innerHTML = history.map(function (item) {
      return '<li><strong>' + item.level.toFixed(0) + '%</strong> level &middot; ' +
        item.depth.toFixed(1) + ' cm depth &middot; ' + item.timestamp.toLocaleTimeString() + '</li>';
    }).join('');
  }

  async function load() {
    const mode = elements.mode.value;
    if (mode !== 'live') {
      if (mode === 'error') {
        renderError('Unable to obtain a valid sensor reading.');
        return;
      }
      try { render(normalize(demoReadings[mode])); } catch (error) { renderError(); }
      return;
    }
    if (!config.channelId || config.channelId === 'YOUR_CHANNEL_ID') {
      renderError('Configure a ThingSpeak channel ID before using live mode.');
      return;
    }
    const params = new URLSearchParams({ results: '1' });
    if (config.readApiKey) params.set('api_key', config.readApiKey);
    try {
      const response = await fetch('https://api.thingspeak.com/channels/' + encodeURIComponent(config.channelId) + '/feeds.json?' + params);
      if (!response.ok) throw new Error('ThingSpeak returned HTTP ' + response.status);
      const data = await response.json();
      if (!data.feeds || !data.feeds.length) throw new Error('ThingSpeak returned no readings');
      render(normalize(data.feeds[0]));
    } catch (error) {
      renderError(error.message);
    }
  }

  elements.mode.addEventListener('change', load);
  elements.refresh.addEventListener('click', load);
  const requestedMode = new URLSearchParams(location.search).get('scenario');
  if (requestedMode && elements.mode.querySelector('option[value="' + requestedMode + '"]')) {
    elements.mode.value = requestedMode;
  }
  load();
  setInterval(load, config.refreshIntervalMs);
}());
