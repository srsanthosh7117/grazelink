#pragma once

#include <Arduino.h>

namespace GrazeLink {

enum class LogLevel : uint8_t { kDebug = 0, kInfo = 1, kWarning = 2, kError = 3 };

/// Lightweight static logger. Keeps every module free of raw Serial.print
/// calls so log format stays consistent and verbosity can be tuned from
/// one place (SetMinLevel) without touching module code.
class Logger {
 public:
  static void SetMinLevel(LogLevel level) { min_level_ = level; }

  static void Debug(const char* tag, const String& message) { Log(LogLevel::kDebug, tag, message); }
  static void Info(const char* tag, const String& message) { Log(LogLevel::kInfo, tag, message); }
  static void Warning(const char* tag, const String& message) { Log(LogLevel::kWarning, tag, message); }
  static void Error(const char* tag, const String& message) { Log(LogLevel::kError, tag, message); }

 private:
  static void Log(LogLevel level, const char* tag, const String& message);
  static LogLevel min_level_;
};

}  // namespace GrazeLink
