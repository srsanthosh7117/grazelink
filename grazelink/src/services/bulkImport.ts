import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { GoatPayload } from '@/types/goat';

const BREEDS = ['Saanen', 'Alpine', 'Nubian', 'Boer', 'Toggenburg', 'Jamunapari', 'Malabari', 'Beetal'];
const FIRST_NAMES = ['Bella', 'Daisy', 'Nala', 'Luna', 'Pepper', 'Milo', 'Rocky', 'Lucky', 'Sally', 'Buddy', 'Misty', 'Olive', 'Ruby', 'Sage', 'Willow', 'Ivy', 'Poppy', 'Hazel', 'Coco', 'Ziggy'];
const COLOURS = ['White', 'Black', 'Brown', 'Tan', 'Spotted', 'Grey'];
const HEALTH_STATUS = ['Healthy', 'Healthy', 'Healthy', 'Healthy', 'Healthy', 'Sick', 'Under Observation'];
const VACCINATION_STATUS = ['Vaccinated', 'Vaccinated', 'Vaccinated', 'Due', 'Not Vaccinated'];
const DEFAULT_SHEDS = ['Shed A', 'Shed B', 'Shed C', 'Shed D'];

const ANCHOR_MS = Date.UTC(2026, 7, 1);
const STEP_MS = Math.floor((365 * 24 * 60 * 60 * 1000) / 50000);
const MAX_BATCH_WRITES = 400;

export interface BulkImportOptions {
  farmName?: string;
  owner?: string;
  sheds?: string[];
  start?: number;
}

function pad(n: number, width: number) {
  return String(n).padStart(width, '0');
}

function randomItem(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface ImportRow {
  [key: string]: string | number | undefined;
  goatId?: string;
  collarId?: string;
  name?: string;
  breed?: string;
  gender?: string;
  age?: number | string;
  weight?: number | string;
  colour?: string;
  dateOfBirth?: string;
  healthStatus?: string;
  vaccinationStatus?: string;
  purchaseDate?: string;
  farmName?: string;
  shedName?: string;
  owner?: string;
  deviceId?: string;
  medicalNotes?: string;
  remarks?: string;
}

/** Finds the next free GT-xxxxx number so re-imports don't overwrite existing bulk goats. */
export async function getNextGoatStart(farmUid: string): Promise<number> {
  try {
    const q = query(collection(db, 'goats'), where('farmUid', '==', farmUid));
    const snap = await getDocs(q);
    let next = 1;
    for (const docSnap of snap.docs) {
      const goatId = docSnap.data().goatId as string | undefined;
      const match = typeof goatId === 'string' ? goatId.match(/^GT-(\d+)$/) : null;
      if (match) {
        const num = parseInt(match[1], 10);
        if (num + 1 > next) next = num + 1;
      }
    }
    return next;
  } catch {
    return 1;
  }
}

/** Generates `count` synthetic goat rows starting from `start`. */
export function generateGoatRows(count: number, start: number, opts: BulkImportOptions = {}): ImportRow[] {
  const rows: ImportRow[] = [];
  for (let i = 0; i < count; i++) {
    const num = start + i;
    const ageMonths = 2 + Math.floor(Math.random() * 58);
    rows.push({
      goatId: `GT-${pad(num, 5)}`,
      collarId: `CL-${pad(num, 5)}`,
      name: `${randomItem(FIRST_NAMES)}-${pad(num, 3)}`,
      breed: randomItem(BREEDS),
      gender: Math.random() < 0.6 ? 'Female' : 'Male',
      age: ageMonths,
      weight: Math.round((15 + Math.random() * 65) * 10) / 10,
      colour: randomItem(COLOURS),
      dateOfBirth: isoDaysAgo(ageMonths * 30),
      healthStatus: randomItem(HEALTH_STATUS),
      vaccinationStatus: randomItem(VACCINATION_STATUS),
      purchaseDate: isoDaysAgo(Math.floor(Math.random() * 730)),
      farmName: opts.farmName ?? 'Red valley Farm',
      shedName: randomItem(opts.sheds && opts.sheds.length ? opts.sheds : DEFAULT_SHEDS),
      owner: opts.owner ?? 'Farm Owner',
    });
  }
  return rows;
}

/** Parses a CSV file (header row = field names) into import rows. */
export function parseGoatCsv(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV file has no data rows.');
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: ImportRow = {};
    headers.forEach((h, idx) => {
      const v = values[idx];
      if (v === undefined || v === '') return;
      if (h === 'age' || h === 'weight') {
        const n = Number(v);
        row[h] = Number.isNaN(n) ? v : n;
      } else {
        row[h] = v;
      }
    });
    return row;
  });
}

function buildPayload(
  row: ImportRow,
  index: number,
  farmUid: string,
  opts: BulkImportOptions,
): GoatPayload & { createdAt: Timestamp } {
  const sheds = opts.sheds && opts.sheds.length ? opts.sheds : DEFAULT_SHEDS;
  const farmName = opts.farmName ?? 'Red valley Farm';
  const goatId = row.goatId ?? `GT-${pad(index + 1, 5)}`;
  return {
    farmUid,
    goatId,
    collarId: row.collarId ?? `CL-${pad(index + 1, 5)}`,
    name: row.name ?? goatId,
    breed: row.breed ?? '',
    gender: row.gender === 'Male' ? 'Male' : 'Female',
    age: Number(row.age ?? 0),
    weight: Number(row.weight ?? 0),
    colour: row.colour ?? '',
    dateOfBirth: row.dateOfBirth ?? '',
    healthStatus: row.healthStatus ?? 'Healthy',
    vaccinationStatus: row.vaccinationStatus ?? 'Vaccinated',
    purchaseDate: row.purchaseDate ?? '',
    farmName: row.farmName ?? farmName,
    shedName: row.shedName ?? sheds[0],
    owner: row.owner ?? opts.owner ?? 'Farm Owner',
    deviceId: row.deviceId,
    medicalNotes: row.medicalNotes,
    remarks: row.remarks,
    createdAt: Timestamp.fromDate(new Date(ANCHOR_MS - index * STEP_MS)),
  };
}

/**
 * Writes goat rows to Firestore in batches of up to 400 docs, calling
 * onProgress after every batch. Uses the goatId as the document id, so
 * re-running merges into the same docs instead of duplicating.
 */
export async function bulkImportGoats(
  farmUid: string,
  rows: ImportRow[],
  opts: BulkImportOptions = {},
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const total = rows.length;
  let done = 0;
  for (let start = 0; start < total; start += MAX_BATCH_WRITES) {
    const chunk = rows.slice(start, start + MAX_BATCH_WRITES);
    const batch = writeBatch(db);
    chunk.forEach((row, offset) => {
      const index = start + offset;
      const goatId = row.goatId ?? `GT-${pad(index + 1, 5)}`;
      batch.set(doc(db, 'goats', goatId), buildPayload(row, index, farmUid, opts), { merge: true });
    });
    await batch.commit();
    done += chunk.length;
    onProgress?.(done, total);
  }
  return done;
}
