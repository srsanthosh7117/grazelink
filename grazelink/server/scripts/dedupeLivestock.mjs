/**
 * Finds livestock documents that share a livestockId within one farm.
 *
 * DRY RUN BY DEFAULT — prints what it would delete and exits without touching
 * anything. Deleting is irreversible, so it only happens when you pass --apply
 * after reading the plan:
 *
 *   node scripts/dedupeLivestock.mjs            # show the plan
 *   node scripts/dedupeLivestock.mjs --apply    # actually delete
 *
 * The keeper is chosen with the same precedence the ingestion API now uses to
 * resolve a collar's document (see resolveLivestockDoc in src/routes/device.ts),
 * so whichever doc the server is already writing telemetry to is the one that
 * survives: has lastReportAt > has coordinates > oldest > lowest doc id.
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
const toMs = (v) => (v && typeof v.toDate === 'function' ? v.toDate().getTime() : 0);

const snap = await db.collection('livestock').get();

// (farmUid, livestockId) -> docs
const groups = new Map();
for (const doc of snap.docs) {
  const d = doc.data();
  if (!d.livestockId) continue;
  const key = `${d.farmUid || '(none)'}|${d.livestockId}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(doc);
}

const dupes = [...groups.entries()].filter(([, docs]) => docs.length > 1);

console.log(`${snap.size} livestock doc(s), ${dupes.length} duplicate group(s)\n`);

if (dupes.length === 0) {
  console.log('Nothing to do.');
  process.exit(0);
}

const doomed = [];

for (const [key, docs] of dupes) {
  const ranked = docs.slice().sort((a, b) => {
    const da = a.data();
    const dbb = b.data();

    const reportA = toMs(da.lastReportAt) > 0 ? 0 : 1;
    const reportB = toMs(dbb.lastReportAt) > 0 ? 0 : 1;
    if (reportA !== reportB) return reportA - reportB;

    const posA = da.lat != null && da.lng != null ? 0 : 1;
    const posB = dbb.lat != null && dbb.lng != null ? 0 : 1;
    if (posA !== posB) return posA - posB;

    const createdA = toMs(da.createdAt);
    const createdB = toMs(dbb.createdAt);
    if (createdA !== createdB) return createdA - createdB;

    return a.id < b.id ? -1 : 1;
  });

  const [keep, ...drop] = ranked;
  const k = keep.data();
  console.log(`${key}  (${docs.length} docs)`);
  console.log(`  KEEP   ${keep.id}  lat=${k.lat} lng=${k.lng} status=${k.status} lastReport=${toMs(k.lastReportAt) || 'never'}`);
  for (const d of drop) {
    const x = d.data();
    console.log(`  DELETE ${d.id}  lat=${x.lat} lng=${x.lng} status=${x.status} lastReport=${toMs(x.lastReportAt) || 'never'}`);
    doomed.push(d);
  }
  console.log();
}

if (!APPLY) {
  console.log(`DRY RUN — ${doomed.length} doc(s) would be deleted. Re-run with --apply to do it.`);
  process.exit(0);
}

const batch = db.batch();
for (const d of doomed) batch.delete(d.ref);
await batch.commit();
console.log(`Deleted ${doomed.length} duplicate doc(s).`);
process.exit(0);
