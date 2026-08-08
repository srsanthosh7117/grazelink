import { z } from 'zod'

/**
 * Matches the exact JSON shape sent by TrackerRecord::ToJson() in the
 * collar firmware (src/modules/tracker/TrackerRecord.cpp). Keep this in
 * sync with the firmware — it is the source of truth for the contract,
 * not the other way around.
 */
export const deviceUploadSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  apiKey: z.string().min(1, 'apiKey is required'),
  goatId: z.string().min(1, 'goatId is required'),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  gpsAccuracy: z.number().finite().nonnegative().optional().default(0),
  battery: z.number().int().min(0).max(100),
  temperature: z.number().finite().optional().default(0),
  signalStrength: z.number().finite().optional().default(0),
  movement: z.boolean().optional().default(false),
  timestamp: z.string().min(1, 'timestamp is required'),
  gpsStatus: z.enum(['FIX', 'NO_FIX']).optional().default('FIX'),
})

/** Registration handshake: the collar proves it has a live GPS fix before
 *  it can be linked to a goat. Unlike deviceUploadSchema, goatId is NOT
 *  required here — a brand-new collar has no goat yet. */
export const deviceLocationSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  apiKey: z.string().min(1, 'apiKey is required'),
  goatId: z.string().optional().default(''),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  gpsAccuracy: z.number().finite().nonnegative().optional().default(0),
  battery: z.number().int().min(0).max(100).optional().default(0),
  temperature: z.number().finite().optional().default(0),
  signalStrength: z.number().finite().optional().default(0),
  movement: z.boolean().optional().default(false),
  timestamp: z.string().min(1, 'timestamp is required'),
  gpsStatus: z.enum(['FIX', 'NO_FIX']).optional().default('FIX'),
})

export const deviceRegisterSchema = z.object({
  deviceId: z.string().min(1),
  collarId: z.string().min(1),
  goatId: z.string().min(1),
  farmName: z.string().min(1),
  shedName: z.string().min(1),
})
