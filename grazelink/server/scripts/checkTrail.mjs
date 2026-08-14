/** READ-ONLY: list every gpsHistory point for one livestock, flagging bad ones. */
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

const FARM = 'hXrAX2V3c8Zl3RiHR4t2kA5oRpr1';

const db = getFirestore();
const snap = await db.collection('gpsHistory').where('farmUid', '==', FARM).get();

const rows = snap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((r) => r.livestockId === 'GT-0001')
  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

console.log(`${rows.length} trail point(s) for GT-0001 on farm ${FARM}\n`);

const bad = [];
const seen = new Map();

for (const r of rows) {
  const nullIsland = r.latitude === 0 && r.longitude === 0;
  const badTime = Number.isNaN(new Date(r.timestamp).getTime());
  const key = `${r.deviceId}|${r.timestamp}`;
  const dup = seen.has(key);
  seen.set(key, true);

  const flags = [
    nullIsland ? 'NULL-ISLAND' : '',
    badTime ? 'BAD-TIMESTAMP' : '',
    dup ? 'DUPLICATE' : '',
  ]
    .filter(Boolean)
    .join(' ');

  console.log(`${r.id}  ${String(r.latitude).padEnd(12)} ${String(r.longitude).padEnd(12)} ts="${r.timestamp}" ${flags}`);
  if (flags) bad.push({ id: r.id, flags });
}

console.log(`\n${bad.length} problem row(s):`);
for (const b of bad) console.log(`  ${b.id}  ${b.flags}`);
process.exit(0);
