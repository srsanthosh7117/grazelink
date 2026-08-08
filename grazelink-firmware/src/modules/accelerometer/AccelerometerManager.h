#pragma once

#include <cstdint>

namespace GrazeLink {

/// Wraps the LIS3DH over I2C. Movement is detected by comparing the
/// magnitude of the current reading against a resting baseline captured
/// once in Begin() — cheap enough to run every wake cycle without relying
/// on the LIS3DH's own interrupt/FIFO features.
class AccelerometerManager {
 public:
  AccelerometerManager(uint8_t sda_pin, uint8_t scl_pin);

  bool Begin();
  bool DetectMovement();

 private:
  uint8_t sda_pin_;
  uint8_t scl_pin_;
  float baseline_g_ = 1.0f;  // ~1g at rest due to gravity
};

}  // namespace GrazeLink
