#pragma once

#include <Arduino.h>

namespace GrazeLink {

struct HttpResult {
  bool ok = false;  // true if the request round-tripped without a transport error
  int status_code = -1;
  String body;
};

/// Raw HTTPS transport to the Node.js backend. Deliberately dumb — it
/// knows nothing about telemetry payload shape or retry policy, both of
/// which live in ApiService / SyncManager. Keeping this layer thin makes
/// it easy to swap in a certificate-pinned WiFiClientSecure later without
/// touching any business logic above it.
class CloudClient {
 public:
  CloudClient(const char* host, uint16_t port, bool use_tls);

  HttpResult PostJson(const char* path, const String& json_body, uint32_t timeout_ms);

 private:
  const char* host_;
  uint16_t port_;
  bool use_tls_;
};

}  // namespace GrazeLink
