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

const privateKey = cleanKey(process.env.FIREBASE_PRIVATE_KEY);

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'dashboard-47a1c',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const db = getFirestore();
const snap = await db.collection('gpsHistory').limit(1000).get();

const fallback = [];   // 13.0827, 80.2707 — fake Chennai fallback
const nofix = [];      // 0,0 — no position
const gzl001 = [];     // old GZL-001 device — ask user
const real = [];       // real Coimbatore fixes

for (const d of snap.docs) {
  const data = d.data();
  if (Math.abs(data.latitude - 13.0827) < 0.0001 && Math.abs(data.longitude - 80.2707) < 0.0001) {
    fallback.push(d.id);
  } else if (data.latitude === 0 && data.longitude === 0) {
    nofix.push(d.id);
  } else if (data.deviceId === 'GZL-001') {
    gzl001.push({ id: d.id, lat: data.latitude, lng: data.longitude, ts: data.timestamp, created: data.createdAt ? data.createdAt.toDate().toISOString() : null });
  } else {
    real.push(d.id);
  }
}

console.log(`FALLBACK (13.0827,80.2707): ${fallback.length}`);
console.log(`NO_FIX (0,0): ${nofix.length}`);
console.log(`GZL-001 (old device): ${gzl001.length}`);
console.log(`REAL (keep): ${real.length}`);

for (const id of fallback) await db.collection('gpsHistory').doc(id).delete();
for (const id of nofix) await db.collection('gpsHistory').doc(id).delete();

console.log(`Deleted ${fallback.length} fallback + ${nofix.length} no-fix records.`);
console.log('\nRemaining GZL-001 records (not deleted, awaiting your decision):');
for (const g of gzl001) console.log(JSON.stringify(g));
console.log('\nRemaining real records: ' + real.length);
