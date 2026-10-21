# Water Level Monitoring Dashboard

A simple static HTML, CSS, and vanilla JavaScript dashboard for ESP32 water-tank readings published to ThingSpeak. The project includes the dashboard, an ESP32 sensor sketch, and screenshots of the main states.

## Run locally

Because browsers restrict some `fetch` and module behaviour on `file:` URLs, serve the folder with any simple static server:

```powershell
cd water-level-dashboard
python -m http.server 8080
```

Open <http://127.0.0.1:8080/>.

## ESP32 setup

The sketch in [esp_code.ino](esp_code.ino) reads an HC-SR04 ultrasonic sensor and uploads readings to ThingSpeak every 20 seconds.

Connect the sensor as follows:

| HC-SR04 pin | ESP32 pin |
| --- | --- |
| TRIG | GPIO 5 |
| ECHO | GPIO 18 |
| VCC | 5V |
| GND | GND |

Before uploading the sketch, set these values at the top of `esp_code.ino`:

- `WIFI_SSID` and `WIFI_PASSWORD` for the Wi-Fi network
- `THINGSPEAK_WRITE_API_KEY` for the ThingSpeak channel
- Tank and sensor calibration constants, if required

The ThingSpeak fields written by the sketch are:

1. Sensor distance in centimetres
2. Water level percentage
3. Water depth in centimetres
4. Numeric status (`0` empty, `1` normal, `2` full/overflow risk)

Use a suitable voltage divider or level shifter for the HC-SR04 ECHO signal if required by your ESP32 board.

## Configure ThingSpeak live mode

Edit [config.js](config.js) and set `demoMode` to `false`:

```js
const DASHBOARD_CONFIG = {
  channelId: 'YOUR_CHANNEL_ID',
  readApiKey: '',
  tankCapacityLitres: 0,
  refreshIntervalMs: 30000,
  emptyThresholdPercent: 15,
  overflowRiskThresholdPercent: 85,
  staleDataTimeoutMs: 120000,
  demoMode: false
};
```

Use a public channel to leave `readApiKey` empty, or put the channel's **Read API Key** there for a private channel. Never put the ThingSpeak **Write API Key** in this frontend. Any key embedded in JavaScript is visible to website visitors.

For a real deployment, keep private credentials out of source control and use a local, ignored configuration file.

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
- `esp_code.ino` - ESP32 ultrasonic sensor and ThingSpeak uploader
- `screenshots/` - captured dashboard and simulation screenshots:
  - [01-normal-water-level.png](screenshots/01-normal-water-level.png)
  - [02-empty-tank-alert.png](screenshots/02-empty-tank-alert.png)
  - [03-overflow-risk-warning.png](screenshots/03-overflow-risk-warning.png)
  - [04-api-error.png](screenshots/04-api-error.png)
  - [05-simulation-overflow-risk.png](screenshots/05-simulation-overflow-risk.png)
  - [06-dashboard-full-overflow-risk.png](screenshots/06-dashboard-full-overflow-risk.png)
  - [07-dashboard-normal-level.png](screenshots/07-dashboard-normal-level.png)
  - [08-dashboard-empty-tank.png](screenshots/08-dashboard-empty-tank.png)
