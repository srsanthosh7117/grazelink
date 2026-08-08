#include "CloudClient.h"

#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include "../../utils/logger/Logger.h"

namespace GrazeLink {

namespace {
constexpr const char* kTag = "Cloud";
}

CloudClient::CloudClient(const char* host, uint16_t port, bool use_tls) : host_(host), port_(port), use_tls_(use_tls) {}

HttpResult CloudClient::PostJson(const char* path, const String& json_body, uint32_t timeout_ms) {
  HttpResult result;
  HTTPClient http;
  WiFiClientSecure secure_client;
  bool began = false;

  if (use_tls_) {
    // NOTE: setInsecure() skips certificate validation and is only
    // acceptable for bring-up/testing. Before shipping to production,
    // replace this with secure_client.setCACert(kRootCa) pinned to your
    // backend's actual TLS certificate.
    secure_client.setInsecure();
    String url = "https://" + String(host_) + ":" + String(port_) + path;
    began = http.begin(secure_client, url);
  } else {
    String url = "http://" + String(host_) + ":" + String(port_) + path;
    began = http.begin(url);
  }

  if (!began) {
    Logger::Error(kTag, "http.begin() failed");
    return result;
  }

  http.addHeader("Content-Type", "application/json");
  http.setTimeout(timeout_ms);

  int status = http.POST(json_body);
  result.ok = status > 0;  // >0 means a real HTTP response came back
  result.status_code = status;

  if (status > 0) {
    result.body = http.getString();
  } else {
    Logger::Error(kTag, "HTTP request failed: " + http.errorToString(status));
  }

  http.end();
  return result;
}

}  // namespace GrazeLink
