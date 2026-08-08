# ESP32 WROOM Smart Livestock Collar — Firmware Guide

## Architecture Overview

```
ESP32 WROOM Collar
   ├── NEO-6M GPS Module (UART Pins 16/17)
   ├── DS18B20 Temperature Sensor (GPIO 4)
   └── Battery Voltage Divider (ADC Pin 34)
         │
         ▼
   Collect GPS & Telemetry
         │
         ▼
   No Wi-Fi? ──► Save JSON records to SPIFFS Flash Storage
         │
   Wi-Fi Connected?
         │
         ▼
   HTTPS POST Request ──► Node.js Backend API (/api/device/upload)
                               │
                               ▼
                       Firebase Firestore
                               │
                               ▼
                       GrazeLink Dashboard
```

## REST API Payload Format

**Endpoint**: `POST http://<SERVER_IP>:5000/api/device/upload`
**Header**: `x-api-key: <this collar's key from the dashboard>`

Each collar has its own API key, generated when you register it on the
**Devices** page in the dashboard. Open that device's card, click the
eye icon to reveal the key, and copy it into `apiKey` in
`firmware_example.ino` before flashing. If a key is ever compromised,
click regenerate on that device's card — the old key stops working
immediately and you'll need to reflash that one collar with the new key.

```json
{
  "deviceId": "ESP32-001",
  "collarId": "CL-1042",
  "goatId": "GT-0001",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "battery": 88,
  "temperature": 38.2,
  "signalStrength": -65,
  "timestamp": "2026-07-30T22:30:00Z"
}
```
