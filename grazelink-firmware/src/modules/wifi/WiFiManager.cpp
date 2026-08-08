#include "WiFiManager.h"

#include <WiFi.h>

#include "../../utils/logger/Logger.h"

namespace GrazeLink {

namespace {
constexpr const char* kTag = "WiFi";
}

WiFiManager::WiFiManager(const char* ssid, const char* password) : ssid_(ssid), password_(password) {}

bool WiFiManager::Connect(uint32_t timeout_ms) {
  if (WiFi.status() == WL_CONNECTED) return true;

  Logger::Info(kTag, "Connecting to " + String(ssid_) + "...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid_, password_);

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeout_ms) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Logger::Info(kTag, "Connected, IP=" + WiFi.localIP().toString());
    return true;
  }

  Logger::Warning(kTag, "Farm Wi-Fi not available");
  return false;
}

bool WiFiManager::IsConnected() const { return WiFi.status() == WL_CONNECTED; }

void WiFiManager::Disconnect() {
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
}

int8_t WiFiManager::SignalStrengthDbm() const {
  return IsConnected() ? static_cast<int8_t>(WiFi.RSSI()) : -127;
}

}  // namespace GrazeLink
