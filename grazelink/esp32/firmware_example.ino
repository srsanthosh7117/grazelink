/*
  GrazeLink — Commercial ESP32 WROOM Smart Livestock Collar Firmware Example
  Board: ESP32 Dev Module
  Libraries Required: TinyGPS++, ArduinoJson, HTTPClient, WiFi
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "FARM_WIFI_SSID";
const char* password = "FARM_WIFI_PASSWORD";

// Node.js Backend API Configuration
const char* serverUrl = "http://192.168.1.100:5000/api/device/upload";
// Paste the key shown on this collar's card on the dashboard's Devices
// page (Register ESP32 Device -> reveal/copy API Key). Each collar has
// its own key — do not reuse one key across multiple devices.
const char* apiKey = "PASTE_THIS_DEVICE_API_KEY_FROM_DASHBOARD";

// Device Identification
const char* deviceId = "ESP32-001";
const char* collarId = "CL-1042";
const char* goatId   = "GT-0001";

void setup() {
  Serial.begin(115200);
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
  } else {
    Serial.println("\nWiFi Unavailable — Storing Telemetry Locally in Flash");
  }
}

void loop() {
  // Read Telemetry Data
  float latitude = 13.0827;     // Simulated GPS latitude (Replace with TinyGPS++ output)
  float longitude = 80.2707;    // Simulated GPS longitude (Replace with TinyGPS++ output)
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
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

  StaticJsonDocument<256> doc;
  doc["deviceId"]       = deviceId;
  doc["collarId"]       = collarId;
  doc["goatId"]         = goatId;
  doc["latitude"]       = lat;
  doc["longitude"]      = lng;
  doc["battery"]        = bat;
  doc["temperature"]    = temp;
  doc["signalStrength"] = rssi;
  doc["timestamp"]      = "2026-07-30T22:30:00Z";

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
