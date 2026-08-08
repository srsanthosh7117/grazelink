#include "AccelerometerManager.h"

#include <Adafruit_LIS3DH.h>
#include <Arduino.h>
#include <Wire.h>

#include "../../config.h"
#include "../../utils/logger/Logger.h"

namespace GrazeLink {

namespace {
constexpr const char* kTag = "Accel";
Adafruit_LIS3DH lis;

float MagnitudeG(const sensors_event_t& event) {
  return sqrtf(event.acceleration.x * event.acceleration.x + event.acceleration.y * event.acceleration.y +
               event.acceleration.z * event.acceleration.z) /
         SENSORS_GRAVITY_STANDARD;
}

}  // namespace

AccelerometerManager::AccelerometerManager(uint8_t sda_pin, uint8_t scl_pin) : sda_pin_(sda_pin), scl_pin_(scl_pin) {}

bool AccelerometerManager::Begin() {
  Wire.begin(sda_pin_, scl_pin_);
  if (!lis.begin()) {
    Logger::Error(kTag, "LIS3DH not found on I2C bus");
    return false;
  }
  lis.setRange(LIS3DH_RANGE_2_G);
  lis.setDataRate(LIS3DH_DATARATE_50_HZ);

  sensors_event_t event;
  lis.getEvent(&event);
  baseline_g_ = MagnitudeG(event);
  Logger::Info(kTag, "Baseline captured: " + String(baseline_g_, 3) + "g");
  return true;
}

bool AccelerometerManager::DetectMovement() {
  sensors_event_t event;
  lis.getEvent(&event);
  float magnitude_g = MagnitudeG(event);
  bool moved = fabsf(magnitude_g - baseline_g_) >= Config::kMovementThresholdG;
  if (moved) Logger::Debug(kTag, "Movement detected (" + String(magnitude_g, 3) + "g)");
  return moved;
}

}  // namespace GrazeLink
