import fs from 'node:fs'
import admin from 'firebase-admin'
import { env } from './env.js'
import { logger } from '../utils/logger.js'

function loadServiceAccount() {
  if (env.firebaseServiceAccountJson) {
    return JSON.parse(env.firebaseServiceAccountJson)
  }
  if (env.firebaseServiceAccountPath) {
    const raw = fs.readFileSync(env.firebaseServiceAccountPath, 'utf8')
    return JSON.parse(raw)
  }
  throw new Error(
    'No Firebase service account configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or ' +
      'FIREBASE_SERVICE_ACCOUNT_JSON in your .env file — see .env.example.',
  )
}

let app
try {
  const serviceAccount = loadServiceAccount()
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
  logger.info(`Firebase Admin initialised for project "${serviceAccount.project_id}"`)
} catch (err) {
  logger.error(`Firebase Admin init failed: ${err.message}`)
  throw err
}

export const firestore = admin.firestore()
export const FieldValue = admin.firestore.FieldValue
export const Timestamp = admin.firestore.Timestamp
export default app
