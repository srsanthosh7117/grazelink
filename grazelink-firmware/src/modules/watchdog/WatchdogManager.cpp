#include "WatchdogManager.h"

#include <Arduino.h>
#include <esp_task_wdt.h>

#include "../../utils/logger/Logger.h"

// NOTE: this targets arduino-esp32 core v2.x, where the watchdog API is
// esp_task_wdt_init(timeout_sec, panic) + esp_task_wdt_add(NULL). If you
// upgrade to core v3.x later, esp_task_wdt_init instead takes a single
// esp_task_wdt_config_t* argument — swap Start() to build that struct
// (timeout_ms, idle_core_mask, trigger_panic) and pass its address instead.

namespace GrazeLink {

namespace {
constexpr const char* kTag = "Watchdog";
}

WatchdogManager::WatchdogManager(uint32_t timeout_sec) : timeout_sec_(timeout_sec) {}

void WatchdogManager::Start() {
  esp_task_wdt_init(timeout_sec_, true);  // true = panic (reset) on timeout
  esp_task_wdt_add(nullptr);              // watch the currently running task (setup/loop)
  running_ = true;
  Logger::Info(kTag, "Watchdog armed (" + String(timeout_sec_) + "s)");
}

void WatchdogManager::Feed() {
  if (running_) esp_task_wdt_reset();
}

void WatchdogManager::Stop() {
  if (!running_) return;
  esp_task_wdt_delete(nullptr);
  running_ = false;
}

}  // namespace GrazeLink