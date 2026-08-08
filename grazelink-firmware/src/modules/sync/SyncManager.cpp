#include "SyncManager.h"

#include "../../utils/logger/Logger.h"

namespace GrazeLink {

namespace {
constexpr const char* kTag = "Sync";
}

SyncManager::SyncManager(StorageManager* storage, ApiService* api, uint32_t upload_timeout_ms)
    : storage_(storage), api_(api), upload_timeout_ms_(upload_timeout_ms) {}

SyncResult SyncManager::RunOnce() {
  SyncResult result;

  while (!storage_->IsEmpty()) {
    TrackerRecord record;
    if (!storage_->PeekOldest(&record)) {
      // Corrupted record was already quarantined inside StorageManager
      // (renamed with .bad) and no longer counts toward IsEmpty(), so
      // just move on to whatever's next.
      continue;
    }

    UploadOutcome outcome = api_->UploadRecord(record, upload_timeout_ms_);

    if (outcome == UploadOutcome::kSuccess) {
      storage_->RemoveOldest();
      result.uploaded_count++;
      continue;
    }

    Logger::Warning(kTag, "Stopping sync pass; " + String(storage_->Count()) + " record(s) remain queued");
    result.storage_empty = storage_->IsEmpty();
    return result;
  }

  Logger::Info(kTag, String(result.uploaded_count) + " record(s) uploaded, queue drained");
  result.storage_empty = true;
  return result;
}

}  // namespace GrazeLink
