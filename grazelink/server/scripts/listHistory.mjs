import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import fs from 'node:fs';

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
const snap = await db.collection('gpsHistory').orderBy('createdAt', 'desc').limit(500).get();
console.log(`TOTAL: ${snap.size}`);
for (const d of snap.docs) {
  const data = d.data();
  console.log(JSON.stringify({
    id: d.id,
    livestockId: data.livestockId,
    deviceId: data.deviceId,
    farmUid: data.farmUid,
    lat: data.latitude,
    lng: data.longitude,
    battery: data.battery,
    temp: data.temperature,
    ts: data.timestamp,
    created: data.createdAt ? data.createdAt.toDate().toISOString() : null,
  }));
}
