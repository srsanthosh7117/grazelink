#pragma once

#include <Arduino.h>

namespace GrazeLink {

struct GpsFix {
  bool valid = false;
  double latitude = 0.0;
  double longitude = 0.0;
  float accuracy_m = 0.0f;  // approximated from HDOP
  String timestamp;         // ISO-8601, derived from GPS time
};

/// Wraps a u-blox MAX-M10S read over UART via TinyGPS++. WaitForFix polls
/// for at most timeout_ms and returns the moment a fix with acceptable
/// HDOP is available — it never holds the GPS on longer than it has to,
/// which matters directly for battery life in grazing mode.
class GpsManager {
 public:
  GpsManager(uint8_t rx_pin, uint8_t tx_pin, uint32_t baud = 9600);

  void Begin();
  void End();
  GpsFix WaitForFix(uint32_t timeout_ms);

 private:
  uint8_t rx_pin_;
  uint8_t tx_pin_;
  uint32_t baud_;
};

}  // namespace GrazeLink
