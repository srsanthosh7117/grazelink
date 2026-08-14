/**
 * Removes unusable gpsHistory rows written before the ingestion API learned to
 * reject them: 0,0 "Null Island" points from NO_FIX uploads, rows whose
 * timestamp will not parse (millis() values from pre-NTP firmware), and
 * duplicates of the same (deviceId, timestamp) reading.
 *
 * DRY RUN BY DEFAULT — prints the plan and exits. Deletion is irreversible, so
 * it only happens with --apply:
 *
 *   node scripts/cleanupTrail.mjs           # show what would go
 *   node scripts/cleanupTrail.mjs --apply   # delete it
 *
 * The dashboard now filters all three cases client-side (see
 * src/services/gpsHistory.ts), so this is tidying the store, not a prerequisite
 * for a correct map.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve('D:/final/grazelink/server/.env') });

const APPLY = process.argv.includes('--apply');

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
const snap = await db.collection('gpsHistory').get();

console.log(`${snap.size} gpsHistory row(s) scanned\n`);

// Oldest first, so the row we keep from a duplicate pair is the original.
const rows = snap.docs
  .map((d) => ({ doc: d, ...d.data() }))
  .sort((a, b) => {
    const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return ta - tb;
  });

const seen = new Set();
const doomed = [];

for (const r of rows) {
  const reasons = [];

  if (typeof r.latitude !== 'number' || typeof r.longitude !== 'number') {
    reasons.push('non-numeric coordinates');
  } else if (r.latitude === 0 && r.longitude === 0) {
    reasons.push('0,0 Null Island');
  }

  if (Number.isNaN(new Date(r.timestamp).getTime())) {
    reasons.push(`unparseable timestamp "${r.timestamp}"`);
  }

  const key = `${r.deviceId}|${r.timestamp}`;
  if (seen.has(key)) reasons.push('duplicate reading');
  seen.add(key);

  if (reasons.length > 0) {
    doomed.push({ id: r.doc.id, ref: r.doc.ref, livestockId: r.livestockId, reasons });
  }
}

if (doomed.length === 0) {
  console.log('Nothing to clean.');
  process.exit(0);
}

for (const d of doomed) {
  console.log(`  ${d.id}  ${d.livestockId || '(no livestock)'}  — ${d.reasons.join(', ')}`);
}

if (!APPLY) {
  console.log(`\nDRY RUN — ${doomed.length} row(s) would be deleted. Re-run with --apply.`);
  process.exit(0);
}

const batch = db.batch();
for (const d of doomed) batch.delete(d.ref);
await batch.commit();
console.log(`\nDeleted ${doomed.length} row(s).`);
process.exit(0);
