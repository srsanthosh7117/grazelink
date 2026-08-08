import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'
import deviceRoutes from './routes/device.routes.js'
import devicesRoutes from './routes/devices.routes.js'
import healthRoutes from './routes/health.routes.js'

// Ensures Firebase Admin is initialised as soon as the app boots, and
// fails fast (with a clear message) if credentials are missing.
import './config/firebase.js'

export const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
)
app.use(express.json({ limit: '256kb' })) // telemetry payloads are tiny; caps abuse
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
)

app.use('/api/health', healthRoutes)
app.use('/api/device', deviceRoutes) // ESP32-facing (apiKey auth)
app.use('/api/devices', devicesRoutes) // dashboard-facing (Firebase ID token auth)

app.use(notFoundHandler)
app.use(errorHandler)
