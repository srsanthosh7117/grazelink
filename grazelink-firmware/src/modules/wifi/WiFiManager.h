#pragma once

#include <cstdint>

namespace GrazeLink {

/// Thin wrapper around ESP32 station-mode Wi-Fi. Deliberately does one
/// thing: connect to the single pre-configured farm network within a
/// timeout, per the spec ("Try connecting only to the predefined Farm
/// Wi-Fi"). No scanning, no fallback AP, no config portal.
class WiFiManager {
 public:
  WiFiManager(const char* ssid, const char* password);

  /// Blocks up to timeout_ms. Returns true if connected before timeout.
  bool Connect(uint32_t timeout_ms);
  bool IsConnected() const;
  void Disconnect();
  int8_t SignalStrengthDbm() const;

 private:
  const char* ssid_;
  const char* password_;
};

}  // namespace GrazeLink
