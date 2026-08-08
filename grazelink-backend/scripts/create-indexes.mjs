import fs from 'node:fs'
import { JWT } from 'google-auth-library'
import 'dotenv/config'

const sa = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'))
const client = new JWT({
  email: sa.client_email,
  key: sa.private_key,
  scopes: ['https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/cloud-platform'],
})
const token = await client.getAccessToken()
const project = sa.project_id
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups`

const indexes = [
  // goats — pagination, generateGoatId, fetchAllGoats (CRITICAL)
  { collectionId: 'goats', fields: [{ fieldPath: 'farmUid', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] },
  // goats — bulkImport GT-* range
  { collectionId: 'goats', fields: [{ fieldPath: 'farmUid', order: 'ASCENDING' }, { fieldPath: 'goatId', order: 'DESCENDING' }] },
  // goats — overview health counts
  { collectionId: 'goats', fields: [{ fieldPath: 'farmUid', order: 'ASCENDING' }, { fieldPath: 'healthStatus', order: 'ASCENDING' }] },
  // goats — overview gps-active count
  { collectionId: 'goats', fields: [{ fieldPath: 'farmUid', order: 'ASCENDING' }, { fieldPath: 'lat', order: 'ASCENDING' }] },
  // alerts — sidebar live alerts
  { collectionId: 'alerts', fields: [{ fieldPath: 'farmUid', order: 'ASCENDING' }, { fieldPath: 'dismissed', order: 'ASCENDING' }] },
  // alerts — alert center ordered list
  { collectionId: 'alerts', fields: [{ fieldPath: 'farmUid', order: 'ASCENDING' }, { fieldPath: 'dismissed', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] },
  // gpsHistory — per-goat history
  { collectionId: 'gpsHistory', fields: [{ fieldPath: 'goatId', order: 'ASCENDING' }, { fieldPath: 'farmUid', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] },
]

for (const { collectionId, fields } of indexes) {
  const url = `${base}/${collectionId}/indexes`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ queryScope: 'COLLECTION', fields }),
  })
  const body = await res.json()
  if (res.ok) {
    console.log(`OK ${collectionId} [${fields.map((f) => f.fieldPath).join(', ')}] -> ${body.name}`)
  } else {
    const msg = body.error?.message || JSON.stringify(body).slice(0, 200)
    if (/already exists/i.test(msg)) {
      console.log(`SKIP ${collectionId} [${fields.map((f) => f.fieldPath).join(', ')}] already exists`)
    } else {
      console.log(`FAIL ${collectionId} [${fields.map((f) => f.fieldPath).join(', ')}] HTTP ${res.status}: ${msg}`)
    }
  }
}
process.exit(0)
