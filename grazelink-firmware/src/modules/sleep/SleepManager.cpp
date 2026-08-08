#include "SleepManager.h"

#include <Arduino.h>
#include <esp_sleep.h>

#include "../../config.h"
#include "../../utils/logger/Logger.h"

namespace GrazeLink {

namespace {
constexpr const char* kTag = "Sleep";
}

void SleepManager::EnterDeepSleep(SleepReason reason) const {
  uint64_t sleep_us = reason == SleepReason::kStorageEmpty ? Config::kSleepEmptyStorageUs : Config::kSleepGrazingUs;

  Logger::Info(kTag, "Entering deep sleep for " + String(sleep_us / 60000000ULL) + " minute(s)");
  Serial.flush();

  esp_sleep_enable_timer_wakeup(sleep_us);
  esp_deep_sleep_start();

  // Unreachable — esp_deep_sleep_start() does not return.
  while (true) {
  }
}

}  // namespace GrazeLink
