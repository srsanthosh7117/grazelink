/**
 * Quick CLI to register a device without going through the dashboard UI
 * (which doesn't have a "register device" screen wired up yet).
 *
 * Usage:
 *   node src/scripts/seedDevice.js <farmUid> <goatDocId> <deviceId>
 *
 * farmUid    — the Firebase Auth uid of the farm owner (Firebase console
 *              → Authentication → Users, or Firestore → farms collection
 *              → the document id).
 * goatDocId  — the Firestore document id of an existing goat in the
 *              top-level `goats` collection (Firestore console → goats
 *              → pick the goat → copy its document id).
 * deviceId   — must match Config::kDeviceId in the collar's config.h
 *              (e.g. "ESP001").
 *
 * Prints the generated apiKey once — copy it into Config::kApiKey in
 * config.h before flashing the collar.
 */
import '../config/firebase.js'
import { registerDevice } from '../services/firestore.service.js'

const [farmUid, goatDocId, deviceId] = process.argv.slice(2)

if (!farmUid || !goatDocId || !deviceId) {
  console.error('Usage: node src/scripts/seedDevice.js <farmUid> <goatDocId> <deviceId>')
  process.exit(1)
}

try {
  const result = await registerDevice({ farmUid, deviceId, goatDocId })
  console.log('\nDevice registered:')
  console.log(JSON.stringify(result, null, 2))
  console.log('\nCopy this into the collar firmware\'s config.h:')
  console.log(`  constexpr const char* kDeviceId = "${result.deviceId}";`)
  console.log(`  constexpr const char* kApiKey = "${result.apiKey}";`)
} catch (err) {
  console.error('Failed to register device:', err.message)
  process.exit(1)
}
