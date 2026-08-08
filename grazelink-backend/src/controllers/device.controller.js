import crypto from 'node:crypto'
import { deviceUploadSchema, deviceLocationSchema } from '../utils/schemas.js'
import { findDeviceByDeviceId, recordDeviceUpload, confirmDeviceLocation } from '../services/firestore.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'

/** Constant-time string comparison so API key checks don't leak timing
 * information about how many leading characters matched. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

// POST /api/device/upload
export const uploadTelemetry = asyncHandler(async (req, res) => {
  const parsed = deviceUploadSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid payload.', parsed.error.flatten())
  }
  const payload = parsed.data

  const device = await authenticateDevice(payload)

  await recordDeviceUpload({
    farmUid: device.farmUid,
    deviceRef: device.deviceRef,
    deviceData: device.data,
    payload,
  })

  logger.info(`Upload OK: device=${payload.deviceId} goat=${payload.goatId} battery=${payload.battery}%`)
  res.status(200).json({ success: true })
})

/** Shared deviceId + apiKey verification for the ESP32-facing endpoints. */
async function authenticateDevice(payload) {
  const device = await findDeviceByDeviceId(payload.deviceId)
  if (!device) {
    logger.warn(`Request rejected: unknown deviceId "${payload.deviceId}"`)
    throw new ApiError(404, 'Unknown device. Register it first via POST /api/devices.')
  }
  if (!safeEqual(payload.apiKey, device.data.apiKey)) {
    logger.warn(`Request rejected: bad apiKey for deviceId "${payload.deviceId}"`)
    throw new ApiError(401, 'Invalid API key for this device.')
  }
  return device
}

// POST /api/device/location — registration handshake. A fresh collar sends
// its first verified GPS fix here; the device is only marked
// registrationStatus: 'gps_confirmed' once a real fix arrives.
export const reportLocation = asyncHandler(async (req, res) => {
  const parsed = deviceLocationSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid payload.', parsed.error.flatten())
  }
  const payload = parsed.data

  const device = await authenticateDevice(payload)

  if (payload.gpsStatus !== 'FIX') {
    logger.info(`Registration pending: device=${payload.deviceId} has no GPS fix yet`)
    throw new ApiError(409, 'No GPS fix acquired yet. Retry on next wake.')
  }

  const result = await confirmDeviceLocation({
    farmUid: device.farmUid,
    deviceRef: device.deviceRef,
    deviceData: device.data,
    payload,
  })

  logger.info(`Registration confirmed: device=${payload.deviceId} @ ${payload.latitude},${payload.longitude}`)
  res.status(200).json({ success: true, registered: true, ...result })
})
