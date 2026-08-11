#pragma once

#include <Arduino.h>

namespace GrazeLink {

/// One GPS/telemetry sample, as stored on flash and later uploaded.
/// gps_status distinguishes a genuine fix from the "no fix within
/// timeout" case in STATE 4 of the spec, so the server can tell the two
/// apart instead of silently receiving 0,0 coordinates.
struct TrackerRecord {
  String device_id;
  String api_key;
  String livestock_id;
  double latitude = 0.0;
  double longitude = 0.0;
  float gps_accuracy = 0.0f;
  uint8_t battery_percent = 0;
  bool movement = false;
  String timestamp;
  String gps_status = "FIX";  // "FIX" | "NO_FIX"

  String ToJson() const;
  static bool FromJson(const String& json, TrackerRecord* out);
};

}  // namespace GrazeLink
