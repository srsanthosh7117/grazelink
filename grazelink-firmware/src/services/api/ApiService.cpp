#include "ApiService.h"

#include <ArduinoJson.h>

#include "../../config.h"
#include "../../utils/logger/Logger.h"

namespace GrazeLink {

namespace {
constexpr const char* kTag = "ApiService";

bool ParseSuccessFlag(const String& body) {
  JsonDocument doc;
  if (deserializeJson(doc, body)) return false;
  return doc["success"] | false;
}

}  // namespace

ApiService::ApiService(CloudClient* cloud_client) : cloud_client_(cloud_client) {}

UploadOutcome ApiService::UploadRecord(const TrackerRecord& record, uint32_t timeout_ms) {
  String payload = record.ToJson();
  Logger::Debug(kTag, "Uploading: " + payload);

  HttpResult result = cloud_client_->PostJson(Config::kUploadPath, payload, timeout_ms);

  if (!result.ok) {
    Logger::Warning(kTag, "Transport failure, record kept for retry");
    return UploadOutcome::kTransportFailed;
  }

  if (result.status_code == 200 && ParseSuccessFlag(result.body)) {
    Logger::Info(kTag, "Record acknowledged by server");
    return UploadOutcome::kSuccess;
  }

  Logger::Warning(kTag, "Server rejected upload (HTTP " + String(result.status_code) + "): " + result.body);
  return UploadOutcome::kServerRejected;
}

RegisterOutcome ApiService::RegisterLocation(const TrackerRecord& record, uint32_t timeout_ms) {
  String payload = record.ToJson();
  Logger::Debug(kTag, "Registration ping: " + payload);

  HttpResult result = cloud_client_->PostJson(Config::kRegisterPath, payload, timeout_ms);

  if (!result.ok) {
    Logger::Warning(kTag, "Registration transport failure, will retry next wake");
    return RegisterOutcome::kTransportFailed;
  }

  if (result.status_code == 200 && ParseSuccessFlag(result.body)) {
    Logger::Info(kTag, "Registration confirmed by server (GPS fix accepted)");
    return RegisterOutcome::kRegistered;
  }

  if (result.status_code == 409) {
    Logger::Info(kTag, "Server reported NO_FIX — retry registration next wake");
    return RegisterOutcome::kNoFixYet;
  }

  Logger::Warning(kTag, "Registration rejected (HTTP " + String(result.status_code) + "): " + result.body);
  return RegisterOutcome::kRejected;
}

}  // namespace GrazeLink
