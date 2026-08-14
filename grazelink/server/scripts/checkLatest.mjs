/** READ-ONLY: show the most recent gpsHistory rows and the livestock doc. */
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

const hist = await db.collection('gpsHistory').orderBy('createdAt', 'desc').limit(6).get();
console.log(`--- latest ${hist.size} gpsHistory rows ---`);
for (const d of hist.docs) {
  const x = d.data();
  console.log(
    `${x.createdAt ? x.createdAt.toDate().toISOString() : '?'}  ` +
      `lat=${x.latitude} lng=${x.longitude}  batt=${x.battery}  ts="${x.timestamp}"`,
  );
}

const live = await db.collection('livestock').get();
console.log(`\n--- livestock (${live.size}) ---`);
for (const d of live.docs) {
  const x = d.data();
  console.log(`${x.livestockId}: lat=${x.lat} lng=${x.lng} batt=${x.battery} status=${x.status}`);
}

const alerts = await db.collection('alerts').get();
const open = alerts.docs.filter((d) => d.data().dismissed !== true);
console.log(`\n--- alerts: ${alerts.size} total, ${open.length} open ---`);
for (const d of open) {
  const x = d.data();
  console.log(`${x.type} (${x.severity}) ${x.livestockId}: ${x.message}`);
}

process.exit(0);
