#!/usr/bin/env node
/**
 * Migration: replace plaintext device API keys with SHA-256 digests at rest.
 *
 * For every `devices` doc that still has a plaintext `apiKey`, computes
 * `apiKeyHash = sha256(apiKey)` and deletes the plaintext field. The server
 * (validateDevice.ts) prefers `apiKeyHash` and only falls back to `apiKey`,
 * so collars keep working without being reflashed.
 *
 * Run from the server directory:
 *   node scripts/hash-device-keys.mjs             # apply
 *   node scripts/hash-device-keys.mjs --dry-run   # preview only
 *
 * Requires the same FIREBASE_* env vars as server/src/config/firebase.ts
 * (loaded from server/.env).
 */
import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import path from 'path';

config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const DRY_RUN = process.argv.includes('--dry-run');

const projectId = process.env.FIREBASE_PROJECT_ID || 'dashboard-47a1c';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
function cleanPrivateKey(raw) {
  if (!raw) return undefined;
  return raw.replace(/\\n/g, '\n').trim().replace(/^"|"$/g, '');
}
const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

if (!getApps().length) {
  if (clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    initializeApp({ projectId });
  }
}

const db = getFirestore();
const BATCH_SIZE = 400;

function sha256Hex(input) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

const snap = await db.collection('devices').get();
let hashed = 0;
let alreadyHashed = 0;
let skipped = 0;
let batch = db.batch();
let ops = 0;

const commit = async () => {
  if (ops > 0) await batch.commit();
  batch = db.batch();
  ops = 0;
};

for (const doc of snap.docs) {
  const data = doc.data();

  if (typeof data.apiKeyHash === 'string' && data.apiKeyHash !== '') {
    alreadyHashed++;
    continue;
  }
  if (typeof data.apiKey !== 'string' || data.apiKey === '') {
    skipped++;
    continue;
  }

  const apiKeyHash = sha256Hex(data.apiKey);
  if (DRY_RUN) {
    hashed++;
    continue;
  }

  batch.update(doc.ref, { apiKeyHash, apiKey: FieldValue.delete() });
  ops++;
  hashed++;
  if (ops >= BATCH_SIZE) await commit();
}
await commit();

console.log(`devices: ${hashed} keys hashed, ${alreadyHashed} already hashed, ${skipped} without a key`);
if (DRY_RUN) {
  console.log('Dry run — nothing written. Re-run without --dry-run to apply.');
} else {
  console.log('Done. Plaintext apiKey removed; collars authenticate via apiKeyHash.');
}
