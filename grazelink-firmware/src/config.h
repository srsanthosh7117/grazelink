#pragma once

#include <cstdint>

// =============================================================================
// GrazeLink Collar — central configuration.
//
// Every tunable value in the firmware lives here so there is exactly one
// place to edit before flashing a new device: no magic numbers buried in
// module source files.
// =============================================================================

namespace GrazeLink {
namespace Config {

// -----------------------------------------------------------------------
// Farm Wi-Fi — the collar only ever tries this one network (see spec:
// "Try connecting only to the predefined Farm Wi-Fi").
// -----------------------------------------------------------------------
constexpr const char* kWifiSsid = "YourFarmWiFi";      // TODO: change to your real Wi-Fi network name
constexpr const char* kWifiPassword = "YourWiFiPassword";  // TODO: change to your real Wi-Fi password
constexpr uint32_t kWifiConnectTimeoutMs = 15000;

// -----------------------------------------------------------------------
// Backend / device identity
// -----------------------------------------------------------------------
// The domain or IP address of your Node.js backend — no https:// prefix,
// no path. Replace with your real server address (e.g. your deployed
// domain, or your machine's LAN IP like 192.168.1.42 for local testing).
constexpr const char* kServerHost = "grazelink-api.onrender.com";
constexpr uint16_t kServerPort = 443;
constexpr const char* kUploadPath = "/api/device/upload";
constexpr const char* kRegisterPath = "/api/device/location";
constexpr bool kUseTls = true;

constexpr const char* kDeviceId = "GZL-001";
constexpr const char* kApiKey = "gzl_24583dc21f179fa168734477ae34f2a16b521f05d40d1eaf";
constexpr const char* kGoatId = "GT-0001";

// -----------------------------------------------------------------------
// Timing
// -----------------------------------------------------------------------
constexpr uint32_t kGpsFixTimeoutMs = 60000;  // STATE 4: max 1 minute wait for a fix
constexpr uint32_t kHttpTimeoutMs = 20000;  // raised from 10s — farm Wi-Fi/mobile backhaul can be slow;
                                             // increase further (e.g. 30000) if uploads keep timing out
constexpr uint64_t kSleepEmptyStorageUs = 30ULL * 60ULL * 1000000ULL;  // 30 min
constexpr uint64_t kSleepGrazingUs = 20ULL * 60ULL * 1000000ULL;       // 20 min

// -----------------------------------------------------------------------
// Battery
// -----------------------------------------------------------------------
constexpr uint8_t kBatteryLowPercent = 20;
constexpr uint8_t kBatteryCriticalPercent = 8;
constexpr float kBatteryFullVoltage = 4.20f;
constexpr float kBatteryEmptyVoltage = 3.30f;

// -----------------------------------------------------------------------
// Pins — matches the confirmed GrazeLink Collar wiring guide
// (ESP32-WROOM-32D DevKit, Veerapandi Shed pilot build).
// -----------------------------------------------------------------------
constexpr uint8_t kPinGpsRx = 16;        // ESP32 RX2 <- GNSS TX
constexpr uint8_t kPinGpsTx = 17;        // ESP32 TX2 -> GNSS RX
constexpr uint8_t kPinAccelSda = 21;     // LIS3DH SDA/SDI
constexpr uint8_t kPinAccelScl = 22;     // LIS3DH SCL
constexpr uint8_t kPinAccelInterrupt = 4;  // LIS3DH I1 — wired per schematic but not yet
                                            // used by AccelerometerManager (it polls instead of
                                            // waking on interrupt); reserved here so no other
                                            // module accidentally claims GPIO4.
constexpr uint8_t kPinBatteryAdc = 34;   // ADC1, input-only pin, behind the 100k/100k divider

// LEDs are NOT part of the confirmed pilot hardware list in the wiring
// guide. These pins are placeholders for if/when status LEDs are added
// to the collar — deliberately kept off GPIO4 (reserved above) and off
// GPIO34/GPIO16/17/21/22 (already claimed). Safe to leave unpopulated;
// LedManager simply drives pins nothing is physically connected to.
constexpr uint8_t kPinLedBlue = 25;
constexpr uint8_t kPinLedYellow = 26;
constexpr uint8_t kPinLedBatteryRed = 27;
constexpr uint8_t kPinLedBatteryGreen = 32;

// -----------------------------------------------------------------------
// Storage
// -----------------------------------------------------------------------
constexpr const char* kRecordsDir = "/records";
constexpr uint16_t kMaxStoredRecords = 2000;  // guard against unbounded flash writes

// -----------------------------------------------------------------------
// Watchdog
// -----------------------------------------------------------------------
constexpr uint32_t kWatchdogTimeoutSec = 120;

// -----------------------------------------------------------------------
// Movement detection
// -----------------------------------------------------------------------
constexpr float kMovementThresholdG = 0.15f;

}  // namespace Config
}  // namespace GrazeLink
