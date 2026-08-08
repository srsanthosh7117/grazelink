import crypto from 'node:crypto'
import { firestore, FieldValue } from '../config/firebase.js'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'

/**
 * Mirrors the GrazeLink dashboard's real Firestore layout
 * (src/services/goats.ts, src/services/devices.ts, src/services/gpsHistory.ts
 * and src/hooks/useGoats.ts / useDevices.ts in the frontend):
 *
 *   farms/{farmUid}        — farm profile (owner = Firebase Auth uid)
 *   goats/{goatDocId}      — one doc per goat/collar, carries a farmUid field
 *   devices/{deviceDocId}  — device → goat mapping + API key, carries a farmUid field
 *   gpsHistory/{historyId} — one doc per uploaded GPS sample, carries a farmUid field
 *
 * Everything is top-level (NOT nested under farms/{farmUid}/... subcollections)
 * so it matches what the dashboard reads and what firestore.rules enforces.
 * Devices are looked up by their `deviceId` field because the collar only
 * knows its own deviceId/apiKey — not which farm owns it.
 */

export async function findDeviceByDeviceId(deviceId) {
  const snapshot = await firestore
    .collection('devices')
    .where('deviceId', '==', deviceId)
    .limit(1)
    .get()

  if (snapshot.empty) return null

  const deviceDoc = snapshot.docs[0]
  const data = deviceDoc.data()

  return {
    farmUid: data.farmUid,
    deviceRef: deviceDoc.ref,
    data,
  }
}

/** Marks a collar as GPS-confirmed (registration handshake) and writes the
 *  prototype's first verified fix onto the device record. If the collar is
 *  already linked to a goat (either via this payload or the stored device
 *  mapping), the goat's live coordinates are initialised from it too. */
export async function confirmDeviceLocation({ farmUid, deviceRef, deviceData, payload }) {
  const nowIso = new Date().toISOString()
  const goatId = payload.goatId || deviceData.goatId || null

  let goatDoc = null
  if (goatId) {
    const goatSnap = await firestore
      .collection('goats')
      .where('goatId', '==', goatId)
      .limit(10)
      .get()
    goatDoc = goatSnap.docs.find((doc) => doc.data().farmUid === farmUid) ?? null
  }

  const batch = firestore.batch()

  batch.set(
    deviceRef,
    {
      registrationStatus: 'gps_confirmed',
      initialLatitude: payload.latitude,
      initialLongitude: payload.longitude,
      registeredAt: FieldValue.serverTimestamp(),
      battery: payload.battery,
      temperature: payload.temperature,
      wifiSignal: payload.signalStrength,
      status: 'Online',
      lastSeen: nowIso,
      lastSeenAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  if (goatDoc) {
    batch.set(
      goatDoc.ref,
      {
        battery: payload.battery,
        temperature: payload.temperature,
        signalStrength: payload.signalStrength,
        lat: payload.gpsStatus === 'FIX' ? payload.latitude : null,
        lng: payload.gpsStatus === 'FIX' ? payload.longitude : null,
        status: 'Online',
        lastSeen: nowIso,
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  }

  await batch.commit()
  return { registered: true, latitude: payload.latitude, longitude: payload.longitude }
}

export async function recordDeviceUpload({ farmUid, deviceRef, deviceData, payload }) {
  const nowIso = new Date().toISOString()

  const goatSnap = await firestore
    .collection('goats')
    .where('goatId', '==', payload.goatId)
    .limit(10)
    .get()
  const goatDoc = goatSnap.docs.find((doc) => doc.data().farmUid === farmUid)

  const batch = firestore.batch()

  batch.set(firestore.collection('gpsHistory').doc(), {
    farmUid,
    goatDocId: goatDoc ? goatDoc.id : null,
    deviceId: payload.deviceId,
    goatId: payload.goatId,
    latitude: payload.latitude,
    longitude: payload.longitude,
    gpsAccuracy: payload.gpsAccuracy,
    battery: payload.battery,
    movement: payload.movement,
    gpsStatus: payload.gpsStatus,
    deviceTimestamp: payload.timestamp,
    createdAt: FieldValue.serverTimestamp(),
    receivedAt: FieldValue.serverTimestamp(),
  })

  if (goatDoc) {
    batch.set(
      goatDoc.ref,
      {
        battery: payload.battery,
        temperature: payload.temperature,
        signalStrength: payload.signalStrength,
        lat: payload.gpsStatus === 'FIX' ? payload.latitude : null,
        lng: payload.gpsStatus === 'FIX' ? payload.longitude : null,
        status: 'Online',
        lastSeen: nowIso,
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  } else {
    logger.warn(`Upload OK but goat "${payload.goatId}" not found under farm ${farmUid}; skipping goat update`)
  }

  batch.set(
    deviceRef,
    {
      battery: payload.battery,
      temperature: payload.temperature,
      wifiSignal: payload.signalStrength,
      status: 'Online',
      lastSync: payload.timestamp,
      lastSeen: nowIso,
      lastSeenAt: FieldValue.serverTimestamp(),
      lastBattery: payload.battery,
      lastGpsStatus: payload.gpsStatus,
      ...(payload.gpsStatus === 'FIX'
        ? {
            // A successful FIX upload also proves GPS — confirm registration
            // and remember the first verified position in case the explicit
            // /api/device/location handshake never ran.
            registrationStatus: 'gps_confirmed',
            ...(deviceData.initialLatitude == null
              ? { initialLatitude: payload.latitude, initialLongitude: payload.longitude }
              : {}),
          }
        : {}),
    },
    { merge: true },
  )

  await batch.commit()
}

/** Registers a new collar for an existing goat. Generates and returns a
 * fresh API key — this is the only time the plaintext key is available,
 * so the caller must copy it into the collar's config.h. */
export async function registerDevice({ farmUid, deviceId, goatDocId }) {
  const goatRef = firestore.collection('goats').doc(goatDocId)
  const goatSnap = await goatRef.get()
  if (!goatSnap.exists) {
    throw new ApiError(404, `No goat found with id "${goatDocId}".`)
  }
  const goat = goatSnap.data()
  if (goat.farmUid && goat.farmUid !== farmUid) {
    throw new ApiError(404, `No goat found with id "${goatDocId}" under this farm.`)
  }

  const existing = await firestore
    .collection('devices')
    .where('deviceId', '==', deviceId)
    .limit(1)
    .get()
  if (!existing.empty) {
    throw new ApiError(409, `Device "${deviceId}" is already registered.`)
  }

  const apiKey = crypto.randomBytes(24).toString('base64url')

  const deviceRef = await firestore.collection('devices').add({
    deviceId,
    apiKey,
    goatDocId,
    goatId: goat.goatId ?? null,
    collarId: goat.collarId ?? null,
    farmUid,
    farmName: goat.farmName ?? null,
    shedName: goat.shedName ?? null,
    firmwareVersion: '',
    registrationStatus: 'pending',
    initialLatitude: null,
    initialLongitude: null,
    battery: 0,
    wifiSignal: 0,
    temperature: 0,
    status: 'Offline',
    lastSync: null,
    createdAt: FieldValue.serverTimestamp(),
    lastSeen: null,
  })

  return { deviceId, apiKey, goatDocId, deviceDocId: deviceRef.id }
}
