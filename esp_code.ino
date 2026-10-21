
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#define WIFI_SSID "CirkitWifi"
#define WIFI_PASSWORD ""
#define THINGSPEAK_WRITE_API_KEY "U6N1XSP0GF53WRSJ"

const float TANK_HEIGHT_CM = 40.0f;
const float SENSOR_OFFSET_CM = 0.0f;
const float EMPTY_DISTANCE_CM = 40.0f;
const float FULL_DISTANCE_CM = 5.0f;
const float EMPTY_PERCENT_MAX = 5.0f;
const float FULL_PERCENT_MIN = 90.0f;
const float MIN_VALID_CM = 2.0f;
const float MAX_VALID_CM = 400.0f;
const uint32_t ECHO_TIMEOUT_US = 25000;
const uint32_t SAMPLE_INTERVAL_MS = 20000;
const uint8_t TRIG_PIN = 5;
const uint8_t ECHO_PIN = 18;

uint32_t lastSample = 0;

bool readDistance(float &cm) {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(3);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long pulse = pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US);
  if (!pulse) {
    return false;
  }

  cm = pulse * 0.0343f / 2.0f;
  return cm >= MIN_VALID_CM && cm <= MAX_VALID_CM;
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.print("Wi-Fi connecting");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 15000) {
    delay(300);
    Serial.print('.');
  }

  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " failed");
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  digitalWrite(TRIG_PIN, LOW);
  pinMode(ECHO_PIN, INPUT);
  WiFi.mode(WIFI_STA);
  Serial.println("Water tank monitor starting");
}

void loop() {
  connectWiFi();

  if (millis() - lastSample < SAMPLE_INTERVAL_MS) {
    delay(100);
    return;
  }

  lastSample = millis();
  float distance;
  if (!readDistance(distance)) {
    Serial.println("Sensor: invalid/no echo; no measurement uploaded.");
    return;
  }

  float depth = constrain(TANK_HEIGHT_CM + SENSOR_OFFSET_CM - distance, 0.0f, TANK_HEIGHT_CM);
  float pct = (EMPTY_DISTANCE_CM - distance) * 100.0f / (EMPTY_DISTANCE_CM - FULL_DISTANCE_CM);
  pct = constrain(pct, 0.0f, 100.0f);
  int status = 1;
  const char *state = "NORMAL";

  if (pct <= EMPTY_PERCENT_MAX) {
    status = 0;
    state = "EMPTY";
  } else if (pct >= FULL_PERCENT_MIN) {
    status = 2;
    state = "FULL/OVERFLOW_RISK";
  }

  const bool wifiConnected = WiFi.status() == WL_CONNECTED;
  const char *wifiState = "disconnected";
  if (wifiConnected) {
    wifiState = "connected";
  }

  Serial.printf(
    "Distance: %.1f cm | Depth: %.1f cm | Level: %.1f%% | Status: %s (%d) | Wi-Fi: %s\n",
    distance,
    depth,
    pct,
    state,
    status,
    wifiState
  );

  if (!wifiConnected) {
    Serial.println("Upload: skipped (Wi-Fi unavailable)");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;

  String url = String("https://api.thingspeak.com/update?api_key=") + THINGSPEAK_WRITE_API_KEY +
    "&field1=" + String(distance, 1) +
    "&field2=" + String(pct, 1) +
    "&field3=" + String(depth, 1) +
    "&field4=" + String(status);

  if (!https.begin(client, url)) {
    Serial.println("Upload: HTTPS setup failed");
    return;
  }

  int code = https.GET();
  String response;
  if (code > 0) {
    response = https.getString();
  }

  https.end();

  if (code == HTTP_CODE_OK && response.toInt() > 0) {
    Serial.printf("Upload: OK (entry %s)\n", response.c_str());
  } else {
    Serial.printf("Upload: failed (HTTP %d, response '%s')\n", code, response.c_str());
  }
}
