#pragma once

#include "../../services/api/ApiService.h"
#include "../storage/StorageManager.h"

namespace GrazeLink {

struct SyncResult {
  uint16_t uploaded_count = 0;
  bool storage_empty = false;
};

/// Drains StorageManager's queue oldest-first via ApiService, matching
/// the spec's STATE 3 (Synchronization): read oldest -> upload -> on ack,
/// delete only that record -> repeat. Stops at the first failure of any
/// kind (transport or server-rejected) rather than pressing on through
/// the rest of the queue — a struggling connection shouldn't burn
/// through every remaining record's worth of retries and battery in one
/// wake cycle. Whatever's left is picked back up next wake.
class SyncManager {
 public:
  SyncManager(StorageManager* storage, ApiService* api, uint32_t upload_timeout_ms);

  SyncResult RunOnce();

 private:
  StorageManager* storage_;
  ApiService* api_;
  uint32_t upload_timeout_ms_;
};

}  // namespace GrazeLink
