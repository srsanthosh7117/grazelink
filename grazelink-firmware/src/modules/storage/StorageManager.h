#pragma once

#include <Arduino.h>

#include "../tracker/TrackerRecord.h"

namespace GrazeLink {

/// Durable FIFO queue for TrackerRecords on internal flash (LittleFS).
/// Each record is its own file, named by a monotonically increasing
/// counter (e.g. /records/0000000042.json) — not one big append-only
/// file. That design choice is deliberate: a single corrupted or
/// partially-written record can never take down the whole queue, and
/// "delete ONLY that uploaded record" (per spec) is just deleting one
/// file rather than rewriting a shared log.
class StorageManager {
 public:
  bool Begin();

  bool IsEmpty() const;
  uint16_t Count() const;

  /// Returns false if the queue is full (Config::kMaxStoredRecords) — the
  /// newest sample is dropped rather than letting flash writes grow
  /// unbounded. Losing one fresh sample is preferable to a queue that
  /// never drains.
  bool Enqueue(const TrackerRecord& record);

  /// Reads the oldest record without removing it. Returns false if the
  /// queue is empty, or if the oldest file failed to parse — in which
  /// case it is quarantined (renamed with a .bad suffix), not silently
  /// dropped, so it can be inspected later without blocking the queue.
  bool PeekOldest(TrackerRecord* out);

  /// Deletes only the oldest record file.
  bool RemoveOldest();

 private:
  String OldestFilename() const;
  uint32_t next_counter_ = 0;
};

}  // namespace GrazeLink
