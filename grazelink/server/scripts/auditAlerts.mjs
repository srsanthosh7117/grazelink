/**
 * READ-ONLY audit of the `alerts` collection.
 *
 * Written to answer one question before any cleanup runs: how much duplicate
 * alert data did the old unconditional-add behaviour leave behind, and how
 * many of those duplicates are still OPEN (dismissed !== true)?
 *
 * That matters because the new dedup logic treats any open alert of a given
 * type as "already raised" and stays quiet — so leftover open duplicates will
 * suppress genuine new alerts until they are cleared.
 *
 * This script writes nothing. Run:  node scripts/auditAlerts.mjs
 */
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
const snap = await db.collection('alerts').get();

console.log(`TOTAL alerts: ${snap.size}\n`);

// type -> { open, dismissed }
const byType = new Map();
// "type|livestockId" -> open count, to find the duplicate pile-ups
const openByPair = new Map();

for (const doc of snap.docs) {
  const d = doc.data();
  const type = d.type || '(none)';
  const isOpen = d.dismissed !== true;

  if (!byType.has(type)) byType.set(type, { open: 0, dismissed: 0 });
  byType.get(type)[isOpen ? 'open' : 'dismissed']++;

  if (isOpen) {
    const key = `${type}|${d.livestockId || '(no livestockId)'}|${d.farmUid || '(no farmUid)'}`;
    openByPair.set(key, (openByPair.get(key) || 0) + 1);
  }
}

console.log('BY TYPE');
console.log('type'.padEnd(20), 'open'.padStart(8), 'dismissed'.padStart(11));
for (const [type, counts] of [...byType.entries()].sort((a, b) => b[1].open - a[1].open)) {
  console.log(type.padEnd(20), String(counts.open).padStart(8), String(counts.dismissed).padStart(11));
}

// Anything above 1 here is a duplicate the new dedup logic would have prevented,
// and is currently suppressing fresh alerts of that type for that animal.
const dupes = [...openByPair.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);

console.log(`\nDUPLICATE OPEN ALERTS (same type + livestock): ${dupes.length} group(s)`);
if (dupes.length === 0) {
  console.log('  none — nothing is being suppressed.');
} else {
  let redundant = 0;
  for (const [key, n] of dupes.slice(0, 40)) {
    console.log(`  ${String(n).padStart(5)}x  ${key}`);
    redundant += n - 1;
  }
  if (dupes.length > 40) console.log(`  ... and ${dupes.length - 40} more group(s)`);
  console.log(`\n  Redundant rows in the groups shown: ${redundant}`);
}

console.log('\nNo documents were modified.');
process.exit(0);
