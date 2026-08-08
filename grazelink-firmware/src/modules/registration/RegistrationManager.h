#pragma once

#include <Arduino.h>

namespace GrazeLink {

/// Persists the one-time "GPS registration confirmed" flag in NVS
/// (Preferences), so the collar runs the /api/device/location handshake
/// only on its first boot — after the server accepts a live fix the flag
/// is set and every later wake goes straight to the normal cycle.
class RegistrationManager {
 public:
  void Begin();
  bool NeedsRegistration() const;
  void MarkRegistered();
  void ResetForTesting();

 private:
  static constexpr const char* kNamespace = "gzl";
  static constexpr const char* kFlagKey = "registered";
  bool registered_ = false;
};

}  // namespace GrazeLink
