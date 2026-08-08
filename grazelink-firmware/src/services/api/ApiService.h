#pragma once

#include <Arduino.h>

#include "../../modules/cloud/CloudClient.h"
#include "../../modules/tracker/TrackerRecord.h"

namespace GrazeLink {

enum class UploadOutcome { kSuccess, kServerRejected, kTransportFailed };

/// Result of the /api/device/location registration handshake. The collar
/// keeps retrying (next wake) for every outcome except kRegistered, which
/// flips the NVS flag and ends registration mode.
enum class RegisterOutcome { kRegistered, kNoFixYet, kRejected, kTransportFailed };

/// Sits between SyncManager and CloudClient: knows the specific
/// /api/device/upload contract (request shape, {"success":true} ack
/// format) so neither the raw transport layer nor the retry loop needs
/// to know it.
class ApiService {
 public:
  explicit ApiService(CloudClient* cloud_client);

  UploadOutcome UploadRecord(const TrackerRecord& record, uint32_t timeout_ms);
  RegisterOutcome RegisterLocation(const TrackerRecord& record, uint32_t timeout_ms);

 private:
  CloudClient* cloud_client_;
};

}  // namespace GrazeLink
