#!/usr/bin/env node
/**
 * Migration: rename the `goats` collection and `goatId` fields to `livestock`.
 *
 * Copies every doc from `goats` into `livestock` (keeping document ids),
 * then renames the identifier fields on devices / gpsHistory / alerts so the
 * renamed app + API can read existing data.
 *
 * Run from the server directory:
 *   node scripts/migrate-goats-to-livestock.mjs            # copies + renames
 *   node scripts/migrate-goats-to-livestock.mjs --delete-source   # also removes `goats`
 *
 * Requires the same FIREBASE_* env vars as server/src/config/firebase.ts
 * (loaded from server/.env).
 */
import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import path from 'path';

config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const DELETE_SOURCE = process.argv.includes('--delete-source');

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

async function copyCollection(from, to, fieldRename) {
  const snap = await db.collection(from).get();
  let copied = 0;
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
    const target = await db.collection(to).doc(doc.id).get();
    if (target.exists) {
      skipped++;
      continue;
    }
    if (fieldRename) {
      for (const [oldKey, newKey] of Object.entries(fieldRename)) {
        if (oldKey in data && !(newKey in data)) {
          data[newKey] = data[oldKey];
          delete data[oldKey];
        }
      }
    }
    batch.set(db.collection(to).doc(doc.id), { ...data, migratedAt: FieldValue.serverTimestamp() });
    ops++;
    copied++;
    if (ops >= BATCH_SIZE) await commit();
  }
  await commit();

  console.log(`${from} -> ${to}: ${copied} copied, ${skipped} already present`);
  return snap.size;
}

async function renameField(collectionName, renames) {
  const snap = await db.collection(collectionName).get();
  let updated = 0;
  let batch = db.batch();
  let ops = 0;

  const commit = async () => {
    if (ops > 0) await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const doc of snap.docs) {
    const data = doc.data();
    const updates = {};
    for (const [oldKey, newKey] of Object.entries(renames)) {
      if (oldKey in data && !(newKey in data)) {
        updates[newKey] = data[oldKey];
        updates[oldKey] = FieldValue.delete();
      }
    }
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      ops++;
      updated++;
      if (ops >= BATCH_SIZE) await commit();
    }
  }
  await commit();
  console.log(`${collectionName}: renamed fields on ${updated} docs`);
}

async function deleteCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  let deleted = 0;
  let batch = db.batch();
  let ops = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    ops++;
    deleted++;
    if (ops >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  console.log(`${collectionName}: deleted ${deleted} docs`);
}

try {
  await copyCollection('goats', 'livestock', { goatId: 'livestockId' });
  await renameField('devices', { goatId: 'livestockId', goatDocId: 'livestockDocId' });
  await renameField('gpsHistory', { goatId: 'livestockId' });
  await renameField('alerts', { goatId: 'livestockId' });

  if (DELETE_SOURCE) {
    await deleteCollection('goats');
  } else {
    console.log('Old `goats` collection left in place. Re-run with --delete-source to remove it.');
  }
  console.log('Migration complete.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
