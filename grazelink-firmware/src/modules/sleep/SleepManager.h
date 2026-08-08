#pragma once

namespace GrazeLink {

enum class SleepReason { kStorageEmpty, kGrazingMode };

/// Puts the ESP32 into deep sleep for the duration dictated by the spec
/// (30 min if nothing happened this cycle, 20 min if grazing/GPS
/// tracking ran) and arms the timer wake source. This call never
/// returns — the chip resets and main.cpp's state machine starts over
/// from BOOT on wake, exactly as STATE 7 describes.
class SleepManager {
 public:
  [[noreturn]] void EnterDeepSleep(SleepReason reason) const;
};

}  // namespace GrazeLink
