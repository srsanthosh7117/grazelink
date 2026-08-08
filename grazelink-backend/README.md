# GrazeLink Backend

Receives GPS/battery telemetry HTTPS-POSTed by the GrazeLink collar
firmware, validates it, and writes it to the same Firestore project the
dashboard reads from — `farms/{uid}/goats/{goatDocId}` gets updated with
the latest reading, and a full history is kept in
`farms/{uid}/gpsHistory`.

The ESP32 never talks to Firestore directly — this backend sits in
between, per the project spec.

## Stack

- Node.js + Express
- Firebase Admin SDK (server-side Firestore + ID token verification)
- zod (payload validation), helmet + cors + express-rate-limit (security),
  winston + morgan (logging)

## Endpoints

| Method | Path | Caller | Auth |
|---|---|---|---|
| `POST` | `/api/device/upload` | ESP32 collar | per-device `apiKey` in the JSON body |
| `POST` | `/api/devices` | Dashboard | Firebase ID token (`Authorization: Bearer <token>`) |
| `GET` | `/api/health` | anyone | none |

### `POST /api/device/upload`

Exact shape sent by `TrackerRecord::ToJson()` in the firmware:

```json
{
  "deviceId": "ESP001",
  "apiKey": "GLK_7a8B91xYpQ23",
  "goatId": "GT-0001",
  "latitude": 11.0123,
  "longitude": 77.0456,
  "gpsAccuracy": 5.2,
  "battery": 87,
  "movement": true,
  "timestamp": "2026-08-05T09:12:00Z",
  "gpsStatus": "FIX"
}
```

Responds `{"success": true}` on success — this is what the firmware's
`ApiService::UploadRecord` checks before deleting the record from local
storage. Non-2xx or `{"success": false}` means the firmware will keep the
record queued and retry next wake cycle.

### `POST /api/devices`

Links a `deviceId` to an existing goat and generates its API key. Body:

```json
{ "deviceId": "ESP001", "goatDocId": "<firestore-doc-id-of-the-goat>" }
```

Response includes the plaintext `apiKey` **once** — copy it into the
collar's `config.h` (`Config::kApiKey`) before flashing. There's no
dashboard screen wired up to call this yet, so for now either call it
with `curl`/Postman (using a real Firebase ID token) or use the seed
script below.

## 1. Install dependencies

```bash
npm install
```

## 2. Get a Firebase service account key

This backend needs **admin** access to your Firestore project (separate
from the dashboard's client-side Firebase config).

1. Firebase console → your project → gear icon → **Project settings** →
   **Service accounts** tab.
2. Click **Generate new private key** → downloads a JSON file.
3. Save it as `serviceAccountKey.json` in this folder (already git-ignored).

```bash
cp .env.example .env
```
Leave `FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json` as-is (default), or
switch to `FIREBASE_SERVICE_ACCOUNT_JSON` for deployment (see comments in `.env.example`).

## 3. Run it

```bash
npm run dev
```
You should see:
```
Firebase Admin initialised for project "your-project-id"
GrazeLink backend listening on port 4000 (development)
```

Check it's alive:
```bash
curl http://localhost:4000/api/health
```

## 4. Register a test device

You need an existing goat in Firestore first (create one from the
dashboard's "Add Goat" form), then find:
- **farmUid** — Firestore console → `farms` collection → the document id (same as the signed-in user's Firebase Auth uid)
- **goatDocId** — Firestore console → `farms/{farmUid}/goats` → the document id of the goat you created

```bash
node src/scripts/seedDevice.js <farmUid> <goatDocId> ESP001
```
This prints a generated `apiKey` — copy the `kDeviceId` and `kApiKey`
lines it prints straight into the firmware's `config.h`.

## 5. Test an upload manually

```bash
curl -X POST http://localhost:4000/api/device/upload \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "ESP001",
    "apiKey": "PASTE_THE_GENERATED_KEY",
    "goatId": "GT-0001",
    "latitude": 11.0123,
    "longitude": 77.0456,
    "gpsAccuracy": 5.2,
    "battery": 87,
    "movement": false,
    "timestamp": "2026-08-05T09:12:00Z",
    "gpsStatus": "FIX"
  }'
```
You should get `{"success":true}` back, and see the goat's card update
live on the dashboard (battery, status → Online, last seen).

## 6. Point the real collar at this backend

The firmware defaults to HTTPS (`Config::kUseTls = true`), which needs a
real TLS certificate on the server side — `localhost` won't have one. Two
options for testing with real hardware:

**Easiest — tunnel with ngrok** (gives you a real HTTPS URL pointing at
your local machine):
```bash
ngrok http 4000
```
Copy the `https://xxxx.ngrok-free.app` host it prints into `config.h`:
```cpp
constexpr const char* kServerHost = "xxxx.ngrok-free.app";
constexpr uint16_t kServerPort = 443;
```

**Local network, no TLS** (fine for bench-testing on the same Wi-Fi):
```cpp
constexpr const char* kServerHost = "192.168.1.42"; // your computer's LAN IP
constexpr uint16_t kServerPort = 4000;
constexpr bool kUseTls = false;
```
and run the backend as-is (it doesn't terminate TLS itself either way —
`kUseTls` only controls whether the *firmware* connects over
`WiFiClientSecure` or a plain socket).

For a real deployment, put this behind a real domain + TLS (e.g. behind
nginx/Caddy, or deploy to a platform that terminates TLS for you), then
set `kServerHost` to that domain and leave `kUseTls = true`.

## Deploying

```bash
docker build -t grazelink-backend .
docker run -p 4000:4000 --env-file .env -v $(pwd)/serviceAccountKey.json:/app/serviceAccountKey.json grazelink-backend
```
(or use `FIREBASE_SERVICE_ACCOUNT_JSON` instead of mounting the file, which
is usually cleaner on managed platforms like Render/Fly/Cloud Run.)

## Notes / next steps

- **CORS**: `CORS_ORIGINS` in `.env` controls which browser origins can
  call this API. Only `/api/devices` is browser-facing today; add your
  production dashboard domain when you deploy it.
- **Device auth**: API keys are compared with a constant-time comparison
  (`crypto.timingSafeEqual`) to avoid leaking timing info, but they're
  stored in Firestore as plaintext for MVP simplicity. For a larger
  fleet, consider hashing them at rest the way you'd hash a password.
- **No dashboard UI yet** for registering a device — `seedDevice.js`
  covers that for now. Adding a "Register device" screen that calls
  `POST /api/devices` with the signed-in user's ID token
  (`await user.getIdToken()`) is a natural next addition.
