#include "TrackerRecord.h"

#include <ArduinoJson.h>

namespace GrazeLink {

String TrackerRecord::ToJson() const {
  JsonDocument doc;
  doc["deviceId"] = device_id;
  doc["apiKey"] = api_key;
  doc["goatId"] = goat_id;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["gpsAccuracy"] = gps_accuracy;
  doc["battery"] = battery_percent;
  doc["movement"] = movement;
  doc["timestamp"] = timestamp;
  doc["gpsStatus"] = gps_status;

  String output;
  serializeJson(doc, output);
  return output;
}

bool TrackerRecord::FromJson(const String& json, TrackerRecord* out) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) return false;

  out->device_id = doc["deviceId"] | "";
  out->api_key = doc["apiKey"] | "";
  out->goat_id = doc["goatId"] | "";
  out->latitude = doc["latitude"] | 0.0;
  out->longitude = doc["longitude"] | 0.0;
  out->gps_accuracy = doc["gpsAccuracy"] | 0.0f;
  out->battery_percent = doc["battery"] | 0;
  out->movement = doc["movement"] | false;
  out->timestamp = doc["timestamp"] | "";
  out->gps_status = doc["gpsStatus"] | "FIX";
  return true;
}

}  // namespace GrazeLink
