#include "BatteryMonitor.h"

#include <Arduino.h>

#include <algorithm>

#include "../../config.h"

namespace GrazeLink {

namespace {
// Adjust to match your actual resistor-divider ratio (e.g. 100k/100k = 2x).
constexpr float kDividerRatio = 2.0f;
constexpr float kAdcReferenceVoltage = 3.3f;
constexpr float kAdcMaxValue = 4095.0f;
}  // namespace

BatteryMonitor::BatteryMonitor(uint8_t adc_pin) : adc_pin_(adc_pin) {}

void BatteryMonitor::Begin() {
  pinMode(adc_pin_, INPUT);
  analogSetPinAttenuation(adc_pin_, ADC_11db);
}

float BatteryMonitor::ReadVoltage() const {
  // Average a handful of samples to smooth out ADC noise.
  uint32_t sum = 0;
  constexpr int kSamples = 8;
  for (int i = 0; i < kSamples; ++i) {
    sum += analogRead(adc_pin_);
    delayMicroseconds(200);
  }
  float raw = static_cast<float>(sum) / kSamples;
  float pin_voltage = (raw / kAdcMaxValue) * kAdcReferenceVoltage;
  return pin_voltage * kDividerRatio;
}

uint8_t BatteryMonitor::ReadPercent() const {
  float voltage = ReadVoltage();
  float clamped = std::min(std::max(voltage, Config::kBatteryEmptyVoltage), Config::kBatteryFullVoltage);
  float percent =
      (clamped - Config::kBatteryEmptyVoltage) / (Config::kBatteryFullVoltage - Config::kBatteryEmptyVoltage) * 100.0f;
  return static_cast<uint8_t>(percent + 0.5f);
}

bool BatteryMonitor::IsLow() const { return ReadPercent() <= Config::kBatteryLowPercent; }
bool BatteryMonitor::IsCritical() const { return ReadPercent() <= Config::kBatteryCriticalPercent; }

}  // namespace GrazeLink
