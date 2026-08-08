import dotenv from 'dotenv'

dotenv.config()

function required(name, fallback) {
  const value = process.env[name] ?? fallback
  return value
}

export const env = {
  port: Number(required('PORT', 4000)),
  nodeEnv: required('NODE_ENV', 'development'),
  corsOrigins: required('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',
  uploadRateLimitWindowMs: Number(required('UPLOAD_RATE_LIMIT_WINDOW_MS', 60000)),
  uploadRateLimitMax: Number(required('UPLOAD_RATE_LIMIT_MAX', 30)),
}
