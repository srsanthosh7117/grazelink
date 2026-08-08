#include "LedManager.h"

#include <Arduino.h>

namespace GrazeLink {

namespace {
constexpr uint32_t kBlinkIntervalMs = 400;
}

LedManager::LedManager(uint8_t pin_blue, uint8_t pin_yellow, uint8_t pin_batt_red, uint8_t pin_batt_green)
    : pin_blue_(pin_blue), pin_yellow_(pin_yellow), pin_batt_red_(pin_batt_red), pin_batt_green_(pin_batt_green) {}

void LedManager::Begin() {
  pinMode(pin_blue_, OUTPUT);
  pinMode(pin_yellow_, OUTPUT);
  pinMode(pin_batt_red_, OUTPUT);
  pinMode(pin_batt_green_, OUTPUT);
  AllOff();
}

void LedManager::SetSyncState(SyncState state) {
  sync_state_ = state;
  Apply();
}

void LedManager::SetGrazingMode(bool active) {
  grazing_ = active;
  Apply();
}

void LedManager::SetBatteryLow(bool low) {
  battery_low_ = low;
  Apply();
}

void LedManager::AllOff() {
  digitalWrite(pin_blue_, LOW);
  digitalWrite(pin_yellow_, LOW);
  digitalWrite(pin_batt_red_, LOW);
  digitalWrite(pin_batt_green_, LOW);
}

void LedManager::Tick() {
  if (sync_state_ != SyncState::kUploading) return;
  uint32_t now = millis();
  if (now - last_blink_toggle_ms_ >= kBlinkIntervalMs) {
    last_blink_toggle_ms_ = now;
    blink_on_ = !blink_on_;
    digitalWrite(pin_blue_, blink_on_ ? HIGH : LOW);
  }
}

void LedManager::Apply() {
  digitalWrite(pin_batt_red_, battery_low_ ? HIGH : LOW);
  digitalWrite(pin_batt_green_, battery_low_ ? LOW : HIGH);

  switch (sync_state_) {
    case SyncState::kOff:
      digitalWrite(pin_blue_, LOW);
      break;
    case SyncState::kUploading:
      break;  // handled by Tick()'s blink pattern
    case SyncState::kSynced:
      digitalWrite(pin_blue_, HIGH);
      break;
  }

  digitalWrite(pin_yellow_, grazing_ ? HIGH : LOW);
}

}  // namespace GrazeLink
