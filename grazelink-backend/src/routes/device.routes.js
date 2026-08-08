import { Router } from 'express'
import { uploadTelemetry, reportLocation } from '../controllers/device.controller.js'
import { uploadRateLimiter } from '../middleware/rateLimiter.js'

const router = Router()

router.post('/upload', uploadRateLimiter, uploadTelemetry)
router.post('/location', uploadRateLimiter, reportLocation)

export default router
