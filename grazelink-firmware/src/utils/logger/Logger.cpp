#include "Logger.h"

namespace GrazeLink {

LogLevel Logger::min_level_ = LogLevel::kInfo;

namespace {

const char* LevelTag(LogLevel level) {
  switch (level) {
    case LogLevel::kDebug:
      return "DEBUG";
    case LogLevel::kInfo:
      return "INFO ";
    case LogLevel::kWarning:
      return "WARN ";
    case LogLevel::kError:
      return "ERROR";
  }
  return "?????";
}

}  // namespace

void Logger::Log(LogLevel level, const char* tag, const String& message) {
  if (level < min_level_) return;
  Serial.printf("[%8lu] %s [%s] %s\n", millis(), LevelTag(level), tag, message.c_str());
}

}  // namespace GrazeLink
