#pragma once

#include <cstdint>

namespace GrazeLink {

enum class SyncState : uint8_t { kOff, kUploading, kSynced };

/// Drives the collar's three-LED status system: Blue = Wi-Fi/sync,
/// Yellow = grazing mode, Red/Green = battery health. All three can be
/// lit at once — Red is simply the cue an operator should notice first.
class LedManager {
 public:
  LedManager(uint8_t pin_blue, uint8_t pin_yellow, uint8_t pin_batt_red, uint8_t pin_batt_green);

  void Begin();
  void SetSyncState(SyncState state);
  void SetGrazingMode(bool active);
  void SetBatteryLow(bool low);
  void AllOff();

  /// Call periodically (e.g. once per main-loop tick) to drive the
  /// blinking pattern for kUploading — nothing else advances that blink
  /// on its own since there's no timer/interrupt behind this class.
  void Tick();

 private:
  uint8_t pin_blue_;
  uint8_t pin_yellow_;
  uint8_t pin_batt_red_;
  uint8_t pin_batt_green_;

  SyncState sync_state_ = SyncState::kOff;
  bool grazing_ = false;
  bool battery_low_ = false;

  uint32_t last_blink_toggle_ms_ = 0;
  bool blink_on_ = false;

  void Apply();
};

}  // namespace GrazeLink
