#include "RegistrationManager.h"

#include <Preferences.h>

#include "../../utils/logger/Logger.h"

namespace GrazeLink {

namespace {
constexpr const char* kTag = "Registration";
}

void RegistrationManager::Begin() {
  Preferences prefs;
  prefs.begin(kNamespace, /*readOnly=*/true);
  registered_ = prefs.getBool(kFlagKey, false);
  prefs.end();

  Logger::Info(
      kTag, registered_ ? "already registered (GPS confirmed)"
                        : "registration pending — GPS handshake required before linking");
}

bool RegistrationManager::NeedsRegistration() const {
  return !registered_;
}

void RegistrationManager::MarkRegistered() {
  Preferences prefs;
  prefs.begin(kNamespace, /*readOnly=*/false);
  prefs.putBool(kFlagKey, true);
  prefs.end();
  registered_ = true;
  Logger::Info(kTag, "marked GPS-registered in NVS");
}

void RegistrationManager::ResetForTesting() {
  Preferences prefs;
  prefs.begin(kNamespace, /*readOnly=*/false);
  prefs.remove(kFlagKey);
  prefs.end();
  registered_ = false;
}

}  // namespace GrazeLink
