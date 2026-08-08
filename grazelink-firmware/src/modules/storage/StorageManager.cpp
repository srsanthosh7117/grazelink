#include "StorageManager.h"

#include <LittleFS.h>

#include "../../config.h"
#include "../../utils/logger/Logger.h"

namespace GrazeLink {

namespace {
constexpr const char* kTag = "Storage";

// Zero-padded so lexicographic filename order matches chronological order.
String FormatFilename(uint32_t counter) {
  char buf[32];
  snprintf(buf, sizeof(buf), "%s/%010lu.json", Config::kRecordsDir, static_cast<unsigned long>(counter));
  return String(buf);
}

}  // namespace

bool StorageManager::Begin() {
  if (!LittleFS.begin(true)) {  // true = format on first-mount failure
    Logger::Error(kTag, "LittleFS mount failed");
    return false;
  }

  if (!LittleFS.exists(Config::kRecordsDir)) {
    LittleFS.mkdir(Config::kRecordsDir);
  }

  // Recover next_counter_ from what's already on disk so a restart never
  // reuses a filename or clobbers an unsent record.
  uint32_t highest = 0;
  File dir = LittleFS.open(Config::kRecordsDir);
  File entry = dir.openNextFile();
  while (entry) {
    uint32_t n = String(entry.name()).toInt();
    if (n > highest) highest = n;
    entry = dir.openNextFile();
  }
  next_counter_ = highest + 1;

  Logger::Info(kTag, "Storage ready, " + String(Count()) + " pending record(s)");
  return true;
}

uint16_t StorageManager::Count() const {
  uint16_t count = 0;
  File dir = LittleFS.open(Config::kRecordsDir);
  File entry = dir.openNextFile();
  while (entry) {
    count++;
    entry = dir.openNextFile();
  }
  return count;
}

bool StorageManager::IsEmpty() const { return Count() == 0; }

bool StorageManager::Enqueue(const TrackerRecord& record) {
  if (Count() >= Config::kMaxStoredRecords) {
    Logger::Warning(kTag, "Storage full, dropping newest sample");
    return false;
  }

  String filename = FormatFilename(next_counter_++);
  File file = LittleFS.open(filename, FILE_WRITE);
  if (!file) {
    Logger::Error(kTag, "Failed to open " + filename + " for write");
    return false;
  }
  file.print(record.ToJson());
  file.close();
  return true;
}

String StorageManager::OldestFilename() const {
  String oldest;
  File dir = LittleFS.open(Config::kRecordsDir);
  File entry = dir.openNextFile();
  while (entry) {
    String name = entry.name();
    if (!name.endsWith(".bad") && (oldest.isEmpty() || name < oldest)) {
      oldest = name;
    }
    entry = dir.openNextFile();
  }
  return oldest;
}

bool StorageManager::PeekOldest(TrackerRecord* out) {
  String name = OldestFilename();
  if (name.isEmpty()) return false;

  String path = String(Config::kRecordsDir) + "/" + name;
  File file = LittleFS.open(path, FILE_READ);
  if (!file) return false;

  String content = file.readString();
  file.close();

  if (!TrackerRecord::FromJson(content, out)) {
    Logger::Error(kTag, "Corrupted record " + path + " — quarantining");
    LittleFS.rename(path, path + ".bad");
    return false;
  }
  return true;
}

bool StorageManager::RemoveOldest() {
  String name = OldestFilename();
  if (name.isEmpty()) return false;
  String path = String(Config::kRecordsDir) + "/" + name;
  return LittleFS.remove(path);
}

}  // namespace GrazeLink
