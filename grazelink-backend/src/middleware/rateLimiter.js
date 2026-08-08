import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

/** A single collar wakes every ~20 minutes and makes at most one upload
 * attempt (plus retries of whatever's queued), so this is deliberately
 * generous per-IP — it exists to blunt abuse/misconfigured devices, not
 * to throttle normal traffic. */
export const uploadRateLimiter = rateLimit({
  windowMs: env.uploadRateLimitWindowMs,
  max: env.uploadRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many upload requests. Please slow down.' },
})
