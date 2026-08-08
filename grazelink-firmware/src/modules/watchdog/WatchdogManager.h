#pragma once

#include <cstdint>

namespace GrazeLink {

/// Wraps the ESP32 hardware task watchdog. If any state-machine step
/// hangs (a GPS read, an HTTP call that never returns) the chip resets
/// itself instead of sitting there draining the battery forever.
class WatchdogManager {
 public:
  explicit WatchdogManager(uint32_t timeout_sec);

  void Start();
  void Feed();
  void Stop();

 private:
  uint32_t timeout_sec_;
  bool running_ = false;
};

}  // namespace GrazeLink
