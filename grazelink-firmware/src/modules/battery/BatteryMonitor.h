#pragma once

#include <cstdint>

namespace GrazeLink {

/// Reads battery voltage via a resistor-divider into an ADC pin and maps
/// it to an approximate state-of-charge percentage between the
/// configured empty/full voltages. Good enough for low-battery alerting;
/// swap in a fuel-gauge IC later if you need tighter accuracy.
class BatteryMonitor {
 public:
  explicit BatteryMonitor(uint8_t adc_pin);

  void Begin();
  float ReadVoltage() const;
  uint8_t ReadPercent() const;
  bool IsLow() const;
  bool IsCritical() const;

 private:
  uint8_t adc_pin_;
};

}  // namespace GrazeLink
