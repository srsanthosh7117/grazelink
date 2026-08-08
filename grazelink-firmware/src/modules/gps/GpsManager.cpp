#include "GpsManager.h"

#include <HardwareSerial.h>
#include <TinyGPS++.h>

#include "../../utils/logger/Logger.h"

namespace GrazeLink {

namespace {
constexpr const char* kTag = "GPS";
// Loose acceptance ceiling for a livestock collar (not survey-grade use).
// Tune down if your deployment needs tighter accuracy.
constexpr float kMaxAcceptableHdop = 5.0f;

HardwareSerial gpsSerial(2);  // UART2
TinyGPSPlus tinyGps;

String FormatIsoTimestamp() {
  if (!tinyGps.date.isValid() || !tinyGps.time.isValid()) return "";
  char buf[25];
  snprintf(buf, sizeof(buf), "%04d-%02d-%02dT%02d:%02d:%02dZ", tinyGps.date.year(), tinyGps.date.month(),
           tinyGps.date.day(), tinyGps.time.hour(), tinyGps.time.minute(), tinyGps.time.second());
  return String(buf);
}

}  // namespace

GpsManager::GpsManager(uint8_t rx_pin, uint8_t tx_pin, uint32_t baud) : rx_pin_(rx_pin), tx_pin_(tx_pin), baud_(baud) {}

void GpsManager::Begin() {
  gpsSerial.begin(baud_, SERIAL_8N1, rx_pin_, tx_pin_);
  Logger::Info(kTag, "GPS UART started");
}

void GpsManager::End() { gpsSerial.end(); }

GpsFix GpsManager::WaitForFix(uint32_t timeout_ms) {
  GpsFix fix;
  uint32_t start = millis();

  while (millis() - start < timeout_ms) {
    while (gpsSerial.available() > 0) {
      tinyGps.encode(gpsSerial.read());
    }

    if (tinyGps.location.isValid() && tinyGps.location.isUpdated() && tinyGps.hdop.isValid() &&
        tinyGps.hdop.hdop() <= kMaxAcceptableHdop) {
      fix.valid = true;
      fix.latitude = tinyGps.location.lat();
      fix.longitude = tinyGps.location.lng();
      // Rough HDOP-to-metres rule of thumb (UERE ~5m for consumer GNSS).
      fix.accuracy_m = tinyGps.hdop.hdop() * 5.0f;
      fix.timestamp = FormatIsoTimestamp();
      Logger::Info(kTag, "Fix acquired: " + String(fix.latitude, 6) + "," + String(fix.longitude, 6));
      return fix;
    }
    delay(100);
  }

  Logger::Warning(kTag, "No GPS fix within timeout");
  return fix;  // valid == false
}

}  // namespace GrazeLink
