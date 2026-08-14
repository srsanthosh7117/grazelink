import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve('D:/final/grazelink/server/.env') });

function cleanKey(raw) {
  if (!raw) return undefined;
  let key = raw.replace(/\\n/g, '\n').trim();
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1).trim();
  return key;
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'dashboard-47a1c',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: cleanKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
  });
}

const db = getFirestore();
const toDelete = ['FztiZq12VbYBThFz6FCi', 'UaIH5dcwJfbOoiOMOMbu', 'PW0RYx2asz0grqfcEq5O'];
for (const id of toDelete) {
  await db.collection('gpsHistory').doc(id).delete();
  console.log(`Deleted ${id}`);
}

const remaining = await db.collection('gpsHistory').get();
console.log(`Remaining gpsHistory records: ${remaining.size}`);
