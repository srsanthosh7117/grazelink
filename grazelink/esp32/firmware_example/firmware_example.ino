/*
  GrazeLink — Commercial ESP32 WROOM Smart Livestock Collar Firmware Example
  Board: ESP32-WROOM-32D-N4 WiFi+BLE DEVKIT (Arduino board: "ESP32 Dev Module")
  Libraries Required: TinyGPS++, ArduinoJson, HTTPClient, WiFi
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>
#include <time.h>

// WiFi Configuration
const char* ssid = "devil's phone";
const char* password = "password";

// Node.js Backend API Configuration
// Live Render host. NOTE: if the free instance has spun down from
// inactivity, the first upload can take 50+ seconds while it cold-starts.
const char* serverUrl = "https://grazelink-api.onrender.com/api/device/upload";
// Paste the key shown on this collar's card on the dashboard's Devices
// page (Register ESP32 Device -> reveal/copy API Key). Each collar has
// its own key — do not reuse one key across multiple devices.
const char* apiKey = "gzl_d510db4adbc0ff6ecf057d3a2365d5b9cb756868cd3db31a";

// Device Identification
const char* deviceId = "ID-001";
const char* collarId = "CL-0001";
const char* livestockId   = "GT-0001";

// GPS Module (NEO-6M) on Serial2: RX = GPIO16, TX = GPIO17
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

// Used only until a real GPS fix is available
const float fallbackLatitude = 13.0827;
const float fallbackLongitude = 80.2707;

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);
  delay(1000);
  Serial.println("GrazeLink ESP32 Collar Initializing...");

  WiFi.begin(ssid, password);
  Serial.print("Connecting to Farm WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    configTime(0, 0, "pool.ntp.org", "time.google.com");
  } else {
    Serial.println("\nWiFi Unavailable — Storing Telemetry Locally in Flash");
  }
}

// ISO-8601 UTC timestamp from the NTP-synced clock.
// Returns "" until the clock is synced so the server assigns the time.
String getUtcTimestamp() {
  time_t now = time(nullptr);
  if (now < 100000) return "";
  struct tm tmv;
  gmtime_r(&now, &tmv);
  char buf[32];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tmv);
  return String(buf);
}

void loop() {
  // Drain the GPS module for up to 5s to try to acquire a fix
  unsigned long gpsListenStart = millis();
  while (millis() - gpsListenStart < 5000) {
    while (gpsSerial.available()) {
      gps.encode(gpsSerial.read());
    }
    delay(2);
  }

  // Use live GPS coords when a fix exists, otherwise the fallback
  float latitude = gps.location.isValid() ? gps.location.lat() : fallbackLatitude;
  float longitude = gps.location.isValid() ? gps.location.lng() : fallbackLongitude;
  int battery = 92;             // Battery percentage
  float temperature = 38.5;     // Body temperature °C
  int signalStrength = WiFi.RSSI();

  if (WiFi.status() == WL_CONNECTED) {
    sendTelemetry(latitude, longitude, battery, temperature, signalStrength);
  } else {
    Serial.println("Offline — Local storage mode active");
  }

  // Interval between transmission bursts (e.g., 30 seconds)
  delay(30000);
}

void sendTelemetry(float lat, float lng, int bat, float temp, int rssi) {
  HTTPClient http;
  http.begin(serverUrl);
  // Free Render instances cold-start in 30-60s after idle spin-down;
  // the default 5s timeout would fail every first upload, so wait longer.
  http.setTimeout(60000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

  StaticJsonDocument<256> doc;
  doc["deviceId"]       = deviceId;
  doc["collarId"]       = collarId;
  doc["livestockId"]         = livestockId;
  doc["latitude"]       = lat;
  doc["longitude"]      = lng;
  doc["battery"]        = bat;
  doc["temperature"]    = temp;
  doc["signalStrength"] = rssi;
  doc["timestamp"]      = getUtcTimestamp();

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("Sending HTTPS Telemetry Payload:");
  Serial.println(jsonPayload);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    Serial.println("Response: " + response);
  } else {
    Serial.print("HTTP Error code: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}
