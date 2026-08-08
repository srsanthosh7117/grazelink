/**
 * GrazeLink IoT Livestock Tracking Collar — main state machine.
 *
 * This file only orchestrates modules; it contains no direct hardware
 * access itself. See config.h for every tunable and README.md for
 * wiring/build instructions.
 *
 * On every wake from deep sleep the ESP32 restarts execution from here —
 * setup() runs the full state machine to completion for this cycle and
 * ends in SleepManager::EnterDeepSleep(), which never returns. loop() is
 * intentionally left empty; there is no persistent runtime loop by
 * design, matching STATE 7's "wake automatically, restart state
 * machine."
 */

#include <Arduino.h>

#include "config.h"
#include "modules/accelerometer/AccelerometerManager.h"
#include "modules/battery/BatteryMonitor.h"
#include "modules/cloud/CloudClient.h"
#include "modules/gps/GpsManager.h"
#include "modules/led/LedManager.h"
#include "modules/registration/RegistrationManager.h"
#include "modules/sleep/SleepManager.h"
#include "modules/storage/StorageManager.h"
#include "modules/sync/SyncManager.h"
#include "modules/tracker/TrackerRecord.h"
#include "modules/watchdog/WatchdogManager.h"
#include "modules/wifi/WiFiManager.h"
#include "services/api/ApiService.h"
#include "utils/logger/Logger.h"

using namespace GrazeLink;

namespace {

constexpr const char* kTag = "Main";

/// Full state list per the product spec. CHECK_STORAGE / UPLOAD /
/// VERIFY_RESPONSE / DELETE_RECORD are one cohesive unit owned by
/// SyncManager (each step is logged from inside it) and represented
/// here as the single kSync state — splitting them into separate
/// top-level switch cases would just duplicate what SyncManager already
/// does internally.
enum class State {
  kInitialize,
  kCheckWifi,
  kRegister,
  kSync,
  kGpsTracking,
  kCheckWifiAgain,
  kDeepSleep,
};

// Modules — constructed once per wake cycle. Deep sleep resets the chip,
// so nothing here needs to survive across cycles except what's already
// durable on flash (StorageManager).
WatchdogManager watchdog(Config::kWatchdogTimeoutSec);
LedManager leds(Config::kPinLedBlue, Config::kPinLedYellow, Config::kPinLedBatteryRed, Config::kPinLedBatteryGreen);
BatteryMonitor battery(Config::kPinBatteryAdc);
WiFiManager wifi(Config::kWifiSsid, Config::kWifiPassword);
GpsManager gps(Config::kPinGpsRx, Config::kPinGpsTx);
AccelerometerManager accelerometer(Config::kPinAccelSda, Config::kPinAccelScl);
StorageManager storage;
RegistrationManager registration;
CloudClient cloud_client(Config::kServerHost, Config::kServerPort, Config::kUseTls);
ApiService api_service(&cloud_client);
SyncManager sync_manager(&storage, &api_service, Config::kHttpTimeoutMs);
SleepManager sleep_manager;

// Tracks whether GPS_TRACKING ran this wake cycle — this, not whether
// the queue happens to be empty afterward, is what decides the deep
// sleep duration (STATE 7): a goat that's out grazing should be checked
// again in 20 minutes even if the record it just generated uploaded
// successfully and left storage empty.
bool grazed_this_cycle = false;

/// STATE: INITIALIZE
bool RunInitialize() {
  Logger::Info(kTag, "STATE: INITIALIZE");
  leds.Begin();
  battery.Begin();
  registration.Begin();
  bool storage_ok = storage.Begin();
  bool accel_ok = accelerometer.Begin();

  leds.SetBatteryLow(battery.IsLow());

  if (!storage_ok) {
    Logger::Error(kTag, "Storage init failed — cannot guarantee no data loss this cycle, sleeping");
    return false;
  }
  if (!accel_ok) {
    Logger::Warning(kTag, "Accelerometer init failed — movement will default to false");
  }
  return true;
}

/// STATE: CHECK_WIFI / CHECK_WIFI_AGAIN
bool RunCheckWifi() {
  Logger::Info(kTag, "STATE: CHECK_WIFI");
  bool connected = wifi.Connect(Config::kWifiConnectTimeoutMs);
  leds.SetSyncState(connected ? SyncState::kUploading : SyncState::kOff);
  return connected;
}

/// STATE: REGISTER — one-time GPS confirmation handshake. The collar grabs
/// a fix and POSTs /api/device/location; only a real FIX flips the device
/// to registrationStatus: 'gps_confirmed' on the server, so a fresh collar
/// cannot be linked to a goat until the prototype has proven its position.
void RunRegistration() {
  Logger::Info(kTag, "STATE: REGISTER (GPS handshake)");
  gps.Begin();
  GpsFix fix = gps.WaitForFix(Config::kGpsFixTimeoutMs);
  gps.End();

  TrackerRecord record;
  record.device_id = Config::kDeviceId;
  record.api_key = Config::kApiKey;
  record.goat_id = Config::kGoatId;
  record.battery_percent = battery.ReadPercent();
  record.movement = accelerometer.DetectMovement();

  if (fix.valid) {
    record.latitude = fix.latitude;
    record.longitude = fix.longitude;
    record.gps_accuracy = fix.accuracy_m;
    record.timestamp = fix.timestamp;
    record.gps_status = "FIX";
  } else {
    record.timestamp = String(millis());
    record.gps_status = "NO_FIX";
  }

  RegisterOutcome outcome = api_service.RegisterLocation(record, Config::kHttpTimeoutMs);
  if (outcome == RegisterOutcome::kRegistered) {
    registration.MarkRegistered();
  }
  // kNoFixYet / kRejected / kTransportFailed → stay pending; the flag is
  // not set, so this state runs again on the next wake with a retry.
}

/// STATE: SYNC (covers CHECK_STORAGE / UPLOAD / VERIFY_RESPONSE / DELETE_RECORD)
void RunSync() {
  Logger::Info(kTag, "STATE: SYNC");
  if (storage.IsEmpty()) {
    Logger::Info(kTag, "Nothing to sync");
    leds.SetSyncState(SyncState::kSynced);
    return;
  }

  SyncResult result = sync_manager.RunOnce();
  leds.SetSyncState(result.storage_empty ? SyncState::kSynced : SyncState::kOff);
}

/// STATE: GPS_TRACKING + STORE_RECORD (grazing mode)
void RunGrazingMode() {
  Logger::Info(kTag, "STATE: GPS_TRACKING (grazing mode)");
  grazed_this_cycle = true;
  leds.SetGrazingMode(true);

  gps.Begin();
  GpsFix fix = gps.WaitForFix(Config::kGpsFixTimeoutMs);
  gps.End();  // power down GPS the moment we're done — battery optimisation

  bool moved = accelerometer.DetectMovement();

  Logger::Info(kTag, "STATE: STORE_RECORD");
  TrackerRecord record;
  record.device_id = Config::kDeviceId;
  record.api_key = Config::kApiKey;
  record.goat_id = Config::kGoatId;
  record.battery_percent = battery.ReadPercent();
  record.movement = moved;

  if (fix.valid) {
    record.latitude = fix.latitude;
    record.longitude = fix.longitude;
    record.gps_accuracy = fix.accuracy_m;
    record.timestamp = fix.timestamp;
    record.gps_status = "FIX";
  } else {
    record.timestamp = String(millis());  // no GPS time available; server can normalise
    record.gps_status = "NO_FIX";
  }

  storage.Enqueue(record);
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);  // let USB-serial settle before the first log line

  Logger::Info(kTag, "=== GrazeLink Collar boot ===");
  watchdog.Start();

  State state = State::kInitialize;

  while (state != State::kDeepSleep) {
    watchdog.Feed();

    switch (state) {
      case State::kInitialize:
        state = RunInitialize() ? State::kCheckWifi : State::kDeepSleep;
        break;

      case State::kCheckWifi:
        state = RunCheckWifi() ? (registration.NeedsRegistration() ? State::kRegister : State::kSync)
                               : State::kGpsTracking;
        break;

      case State::kRegister:
        RunRegistration();
        state = State::kSync;
        break;

      case State::kSync:
        RunSync();
        wifi.Disconnect();  // Wi-Fi only stays on during sync — battery optimisation
        state = State::kDeepSleep;
        break;

      case State::kGpsTracking:
        RunGrazingMode();
        state = State::kCheckWifiAgain;
        break;

      case State::kCheckWifiAgain:
        Logger::Info(kTag, "STATE: CHECK_WIFI_AGAIN");
        state = RunCheckWifi() ? (registration.NeedsRegistration() ? State::kRegister : State::kSync)
                               : State::kDeepSleep;
        break;

      default:
        state = State::kDeepSleep;
        break;
    }

    leds.Tick();
  }

  Logger::Info(kTag, "STATE: DEEP_SLEEP");
  watchdog.Stop();

  SleepReason reason = grazed_this_cycle ? SleepReason::kGrazingMode : SleepReason::kStorageEmpty;
  sleep_manager.EnterDeepSleep(reason);  // never returns
}

void loop() {
  // Intentionally empty — see file header comment.
}
