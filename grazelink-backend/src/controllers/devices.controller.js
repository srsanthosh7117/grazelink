import { z } from 'zod'
import { registerDevice } from '../services/firestore.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'

const registerSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  goatDocId: z.string().min(1, 'goatDocId is required'),
})

// POST /api/devices  (dashboard-authenticated — Authorization: Bearer <Firebase ID token>)
export const createDevice = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid payload.', parsed.error.flatten())
  }

  const result = await registerDevice({
    farmUid: req.user.uid,
    deviceId: parsed.data.deviceId,
    goatDocId: parsed.data.goatDocId,
  })

  // apiKey is only ever returned here, at creation time — copy it into
  // the collar's config.h (Config::kApiKey) before flashing.
  res.status(201).json({ success: true, device: result })
})
