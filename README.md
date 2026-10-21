# Water Level Monitoring Dashboard

A simple static HTML, CSS, and vanilla JavaScript dashboard for ESP32 water-tank readings published to ThingSpeak.

## Run locally

Because browsers restrict some `fetch` and module behaviour on `file:` URLs, serve the folder with any simple static server:

```powershell
cd water-level-dashboard
python -m http.server 8080
```

Open <http://127.0.0.1:8080/>.

## Configure ThingSpeak live mode

Edit [config.js](config.js):

```js
const DASHBOARD_CONFIG = {
  channelId: 'YOUR_CHANNEL_ID',
  readApiKey: '',
  tankCapacityLitres: 0,
  refreshIntervalMs: 30000,
  emptyThresholdPercent: 15,
  overflowRiskThresholdPercent: 85,
  staleDataTimeoutMs: 120000,
  demoMode: true
};
```

Use a public channel to leave `readApiKey` empty, or put the channel's **Read API Key** there for a private channel. Never put the ThingSpeak **Write API Key** in this frontend. Any key embedded in JavaScript is visible to website visitors.

The channel fields must be:

1. Distance in centimetres
2. Water level percentage
3. Water depth in centimetres
4. Numeric status code (`0` empty, `1` normal, `2` full/overflow risk)

The dashboard uses the configured percentage thresholds as the alert source of truth. It displays the ESP32 status code for reference but never lets that code override a valid percentage calculation.

## Demo scenarios

The default mode is safe demo mode, so the dashboard works without credentials. Use the data-mode selector:

- `Demo: normal`
- `Demo: empty`
- `Demo: overflow risk`
- `Demo: stale data`
- `Demo: API error`
- `Live ThingSpeak`

Scenarios can also be opened directly for testing: `?scenario=empty`, `?scenario=full`, `?scenario=stale`, or `?scenario=error`. Demo values are isolated from live mode and never mixed with API responses.

## Behaviour and troubleshooting

- Refresh occurs every `refreshIntervalMs`; keep it compatible with the ThingSpeak update rate.
- Empty, invalid, missing, and non-numeric fields show `SENSOR/DATA ERROR`; a failed request is never treated as 0%.
- Readings older than `staleDataTimeoutMs` show `STALE DATA`.
- A public channel must be readable without authentication. For private channels, check the Read API key and channel ID.
- Browser console/network errors usually indicate an incorrect channel, key, CORS/network access, or a ThingSpeak API limit.
- Alerts remain visible while this page is open. Browser notifications when the page is closed require an additional notification service.

## Files

- `index.html` - dashboard markup
- `style.css` - minimal responsive styling
- `config.js` - local configuration placeholders
- `app.js` - API fetching, validation, alert logic, and demo scenarios
- `screenshots/` - captured demo-state screenshots
