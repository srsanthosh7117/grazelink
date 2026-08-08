# GrazeLink Collar Firmware

Production-structured ESP32-S3 firmware for the GrazeLink livestock tracking
collar. Built as a PlatformIO project so the modular folder layout maps
directly onto real C++ translation units — no giant `.ino` with everything
in `setup()`/`loop()`.

```
ESP32  →  Farm Wi-Fi  →  HTTPS POST  →  Node.js backend  →  Firestore  →  React dashboard
```

The collar **never** talks to Firebase directly — only to your backend's
`/api/device/upload` endpoint.

## Folder structure

```
src/
  main.cpp                     State machine orchestrator (Phase 11)
  config.h                     Every tunable constant (Phase 2)
  modules/
    wifi/         WiFiManager           Farm Wi-Fi connect/disconnect (Phase 4)
    gps/          GpsManager            u-blox MAX-M10S via TinyGPS++ (Phase 5)
    accelerometer/AccelerometerManager  LIS3DH movement detection (Phase 6)
    tracker/      TrackerRecord         Data struct + JSON (de)serialization (Phase 7)
    storage/      StorageManager        Durable LittleFS record queue (Phase 7)
    cloud/        CloudClient           Raw HTTPS transport (Phase 8)
    sync/         SyncManager           Upload/retry/delete loop (Phase 9)
    led/          LedManager            3-LED status system
    battery/      BatteryMonitor        Voltage → percentage
    sleep/        SleepManager          Deep sleep timing (Phase 10)
    watchdog/     WatchdogManager       Hardware watchdog
  services/
    api/          ApiService            /api/device/upload contract (Phase 8)
  utils/
    logger/       Logger                Leveled logging (Phase 3)
platformio.ini                          Board + library manifest (Phase 12)
```

## Before you flash anything

Edit **`src/config.h`** — every value that differs per-device or per-farm
lives there:

| Constant | What to set it to |
|---|---|
| `kWifiSsid` / `kWifiPassword` | Your farm's actual Wi-Fi credentials |
| `kServerHost` / `kServerPort` | Where your Node.js backend is reachable |
| `kUseTls` | `false` if testing against plain `http://` on your LAN |
| `kDeviceId` / `kApiKey` | Must match what the backend expects for this collar |
| `kGoatId` | Must match a goat already registered in the app |
| Pin constants | Match your actual wiring (see below) |

**Registration order matters**: register the goat in the app first, *then*
flash the firmware with matching `goatId`/`collarId` — the backend matches
incoming telemetry to an existing goat record by those fields.

## Wiring reference

| Module | ESP32-S3 pin (default in config.h) | Notes |
|---|---|---|
| GPS RX | GPIO 16 | Connects to GPS module's TX |
| GPS TX | GPIO 17 | Connects to GPS module's RX |
| Accelerometer SDA | GPIO 8 | I2C |
| Accelerometer SCL | GPIO 9 | I2C |
| Battery ADC | GPIO 1 | Behind a resistor divider — see `BatteryMonitor.cpp` for the ratio assumption |
| LED — Blue (Wi-Fi/sync) | GPIO 4 | |
| LED — Yellow (grazing) | GPIO 5 | |
| LED — Battery Red | GPIO 6 | |
| LED — Battery Green | GPIO 7 | |

## Build & flash (PlatformIO)

1. Install the [PlatformIO extension](https://platformio.org/) for VS Code, or the CLI.
2. Open this folder as a PlatformIO project.
3. `pio run` to build, `pio run -t upload` to flash, `pio device monitor` to watch serial logs at 115200 baud.

## Design notes / known caveats

- **TLS is not certificate-pinned yet.** `CloudClient.cpp` uses
  `WiFiClientSecure::setInsecure()` for bring-up. Before production,
  replace it with `setCACert()` pinned to your backend's real certificate.
- **Watchdog API targets arduino-esp32 core v3.x.** If you're on core v2.x,
  `WatchdogManager.cpp` has a comment showing the older call signature to
  swap in.
- **`File::name()` behavior on LittleFS** can return either a bare filename
  or a path depending on core version — `StorageManager.cpp` assumes a bare
  filename under `/records`. Print `entry.name()` once during bring-up to
  confirm on your installed core version, and adjust `OldestFilename()` if needed.
- **Battery divider ratio** (`kDividerRatio` in `BatteryMonitor.cpp`) assumes
  a 2:1 divider — change it to match your actual resistor values.
- I was unable to compile this against a real ESP32 toolchain in the
  environment that generated it (no network access to fetch PlatformIO's
  toolchain/libraries). Everything here was written and reviewed carefully
  against the Arduino-ESP32 / TinyGPS++ / ArduinoJson v7 / Adafruit_LIS3DH
  APIs, but please run `pio run` locally as your first step and treat any
  compiler error as a real bug report — paste it back and I'll fix it directly.

## Phase-by-phase summary

1. **Folder structure** — modular `src/modules/*`, `src/services/*`, `src/utils/*`.
2. **Configuration** — all tunables centralized in `config.h`.
3. **Logging foundation** — `Logger` gives every module consistent, leveled output.
4. **Wi-Fi module** — connects only to the pre-configured farm network, nothing else.
5. **GPS module** — TinyGPS++ over UART2, bounded wait, HDOP-gated fix acceptance.
6. **Accelerometer module** — baseline-relative movement detection via LIS3DH.
7. **Storage module** — one file per record on LittleFS so a corrupt record
   can never take the queue down, and "delete only the uploaded record" is
   a single file removal.
8. **Cloud + API service** — `CloudClient` is a dumb HTTPS transport;
   `ApiService` owns the upload payload/ack contract on top of it.
9. **Sync module** — drains the queue oldest-first, stopping cleanly on the
   first failure so nothing is ever deleted without a server acknowledgment.
10. **Sleep module** — 20 minutes after a grazing cycle, 30 minutes otherwise;
    deep sleep is the only thing that ends `setup()`.
11. **main.cpp** — the state machine itself, matching BOOT → INITIALIZE →
    CHECK_WIFI → (SYNC | GPS_TRACKING → STORE_RECORD → CHECK_WIFI_AGAIN) → DEEP_SLEEP.
12. **This README** — build instructions and the caveats above stand in for
    an on-device test suite, since unit-testing embedded HAL-dependent code
    needs real hardware or a hardware mock layer neither of which fits in
    a single firmware drop — flashing to a real board and watching the
    serial monitor through one full grazing → sync cycle is the practical
    test pass here.
