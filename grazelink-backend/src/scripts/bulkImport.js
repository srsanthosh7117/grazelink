/**
 * Bulk-import a large herd (e.g. 50,000 goats) into Firestore for a single
 * farm, so the dashboard can be stress-tested at real scale.
 *
 * Usage:
 *   node src/scripts/bulkImport.js --farmUid <uid> [options]
 *
 * Options:
 *   --count <n>       number of goats to create (default 50000)
 *   --csv <path>      optional CSV file of goat rows (header row = field names)
 *   --with-devices    also create a `devices` doc + apiKey for every goat
 *   --sheds "A,B,C"   comma-separated shed names (synthetic data only)
 *   --owner <name>    owner field value (default "Farm Owner")
 *   --farm-name <n>   farmName field value (default "Red valley Farm")
 *   --batch-size <n>  Firestore writes per batch (max 500)
 *   --dry-run         print sample rows without writing anything
 *
 * Goat documents use their goatId as the Firestore document id, so re-running
 * the script is idempotent (profile fields are merged, live telemetry fields
 * like battery/lat/lng are never overwritten).
 *
 * 50,000 goats = 50,000 writes (plus 50,000 more with --with-devices). The
 * free Spark plan allows 20k writes/day; Blaze bills ~50k/day free then per
 * write, so expect to be on Blaze for a full run.
 */
import fs from 'node:fs'
import crypto from 'node:crypto'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { firestore, FieldValue, Timestamp } from '../config/firebase.js'

const BREEDS = ['Saanen', 'Alpine', 'Nubian', 'Boer', 'Toggenburg', 'Jamunapari', 'Malabari', 'Beetal']
const FIRST_NAMES = ['Bella', 'Daisy', 'Nala', 'Luna', 'Pepper', 'Milo', 'Rocky', 'Lucky', 'Sally', 'Buddy', 'Misty', 'Olive', 'Ruby', 'Sage', 'Willow', 'Ivy', 'Poppy', 'Hazel', 'Coco', 'Ziggy']
const COLOURS = ['White', 'Black', 'Brown', 'Tan', 'Spotted', 'Grey']
const HEALTH_STATUS = ['Healthy', 'Healthy', 'Healthy', 'Healthy', 'Healthy', 'Sick', 'Under Observation']
const VACCINATION_STATUS = ['Vaccinated', 'Vaccinated', 'Vaccinated', 'Due', 'Not Vaccinated']
const DEFAULT_SHEDS = ['Shed A', 'Shed B', 'Shed C', 'Shed D']
const ANCHOR_MS = Date.UTC(2026, 7, 1)
const STEP_MS = Math.floor((365 * 24 * 60 * 60 * 1000) / 50000)

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    count: null,
    farmUid: null,
    csv: null,
    withDevices: false,
    sheds: null,
    owner: 'Farm Owner',
    farmName: 'Red valley Farm',
    batchSize: 500,
    dryRun: false,
    delete: false,
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = () => args[++i]
    switch (arg) {
      case '--count':
        opts.count = parseInt(next(), 10)
        break
      case '--farmUid':
        opts.farmUid = next()
        break
      case '--csv':
        opts.csv = next()
        break
      case '--with-devices':
        opts.withDevices = true
        break
      case '--sheds':
        opts.sheds = next().split(',').map((s) => s.trim()).filter(Boolean)
        break
      case '--owner':
        opts.owner = next()
        break
      case '--farm-name':
        opts.farmName = next()
        break
      case '--batch-size':
        opts.batchSize = Math.min(parseInt(next(), 10), 500)
        break
      case '--dry-run':
        opts.dryRun = true
        break
      case '--delete':
        opts.delete = true
        break
      default:
        console.error(`Unknown option: ${arg}`)
        process.exit(1)
    }
  }
  return opts
}

async function ask(question, defaultValue) {
  const rl = readline.createInterface({ input, output })
  const hint = defaultValue !== undefined ? ` (default ${defaultValue})` : ''
  try {
    const answer = await rl.question(`${question}${hint}: `)
    const trimmed = answer.trim()
    return trimmed === '' && defaultValue !== undefined ? String(defaultValue) : trimmed
  } finally {
    rl.close()
  }
}

async function promptMissing(opts) {
  if (!opts.farmUid) {
    opts.farmUid = await ask('Farm owner UID (farmUid)')
  }
  if (opts.count == null) {
    const raw = await ask('How many goats to add', '50000')
    const parsed = parseInt(raw, 10)
    if (!Number.isInteger(parsed) || parsed < 1) {
      console.error('Invalid goat count:', raw)
      process.exit(1)
    }
    opts.count = parsed
  }
}

function pad(n, width) {
  return String(n).padStart(width, '0')
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function generateRow(i, opts) {
  const goatId = `GT-${pad(i + 1, 5)}`
  const ageMonths = 2 + Math.floor(Math.random() * 58)
  return {
    goatId,
    collarId: `CL-${pad(i + 1, 5)}`,
    name: `${randomItem(FIRST_NAMES)}-${pad(i + 1, 3)}`,
    breed: randomItem(BREEDS),
    gender: Math.random() < 0.6 ? 'Female' : 'Male',
    age: ageMonths,
    weight: Math.round((15 + Math.random() * 65) * 10) / 10,
    colour: randomItem(COLOURS),
    dateOfBirth: isoDaysAgo(ageMonths * 30),
    healthStatus: randomItem(HEALTH_STATUS),
    vaccinationStatus: randomItem(VACCINATION_STATUS),
    purchaseDate: isoDaysAgo(Math.floor(Math.random() * 730)),
    farmName: opts.farmName,
    shedName: randomItem(opts.sheds),
    owner: opts.owner,
  }
}

function loadRows(opts) {
  if (!opts.csv) {
    const rows = []
    for (let i = 0; i < opts.count; i++) rows.push(generateRow(i, opts))
    return rows
  }
  const raw = fs.readFileSync(opts.csv, 'utf8')
  const lines = raw.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error(`CSV has no data rows: ${opts.csv}`)
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    const row = {}
    headers.forEach((h, idx) => {
      const v = values[idx]
      if (v === undefined || v === '') return
      if (h === 'age' || h === 'weight') {
        const n = Number(v)
        if (!Number.isNaN(n)) row[h] = n
      } else {
        row[h] = v
      }
    })
    return row
  })
}

function buildGoatDoc(row, i, opts) {
  const createdAt = Timestamp.fromDate(new Date(ANCHOR_MS - i * STEP_MS))
  const base = {
    farmUid: opts.farmUid,
    goatId: row.goatId,
    collarId: row.collarId ?? null,
    name: row.name ?? row.goatId,
    breed: row.breed ?? '',
    gender: row.gender === 'Male' ? 'Male' : 'Female',
    age: row.age ?? 0,
    weight: row.weight ?? 0,
    colour: row.colour ?? '',
    dateOfBirth: row.dateOfBirth ?? null,
    healthStatus: row.healthStatus ?? 'Healthy',
    vaccinationStatus: row.vaccinationStatus ?? 'Vaccinated',
    purchaseDate: row.purchaseDate ?? null,
    farmName: row.farmName ?? opts.farmName,
    shedName: row.shedName ?? (opts.sheds ? opts.sheds[0] : DEFAULT_SHEDS[0]),
    owner: row.owner ?? opts.owner,
    deviceId: row.deviceId ?? null,
    createdAt,
  }
  if (row.medicalNotes) base.medicalNotes = row.medicalNotes
  else base.medicalNotes = null
  if (row.remarks) base.remarks = row.remarks
  else base.remarks = null
  return base
}

const GOAT_MERGE_FIELDS = [
  'farmUid', 'goatId', 'collarId', 'name', 'breed', 'gender', 'age', 'weight',
  'colour', 'dateOfBirth', 'healthStatus', 'vaccinationStatus', 'purchaseDate',
  'farmName', 'shedName', 'owner', 'deviceId', 'medicalNotes', 'remarks', 'createdAt',
]

function buildDeviceDoc(goatDoc) {
  return {
    deviceId: `ESP-${goatDoc.goatId.slice(3)}`,
    apiKey: crypto.randomBytes(24).toString('base64url'),
    goatDocId: goatDoc.goatId,
    goatId: goatDoc.goatId,
    collarId: goatDoc.collarId,
    farmUid: goatDoc.farmUid,
    farmName: goatDoc.farmName,
    shedName: goatDoc.shedName,
    firmwareVersion: '',
    battery: 0,
    wifiSignal: 0,
    temperature: 0,
    status: 'Offline',
    lastSync: null,
    createdAt: FieldValue.serverTimestamp(),
    lastSeen: null,
  }
}

async function commitWithRetry(batch, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await batch.commit()
      return
    } catch (err) {
      if (i === attempts) throw err
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i))
    }
  }
}

async function run() {
  const opts = parseArgs()
  await promptMissing(opts)
  if (!opts.sheds) opts.sheds = DEFAULT_SHEDS

  if (opts.delete) {
    const goatIds = Array.from({ length: opts.count }, (_, i) => `GT-${pad(i + 1, 5)}`)
    const started = Date.now()
    let deleted = 0
    for (let start = 0; start < goatIds.length; start += opts.batchSize) {
      const batch = firestore.batch()
      goatIds.slice(start, start + opts.batchSize).forEach((id) => {
        batch.delete(firestore.collection('goats').doc(id))
      })
      await commitWithRetry(batch)
      deleted += Math.min(opts.batchSize, goatIds.length - start)
      console.log(`  deleted ${deleted}/${goatIds.length} in ${((Date.now() - started) / 1000).toFixed(1)}s`)
    }
    console.log(`\nDone. Deleted up to ${deleted} imported goat documents from 'goats'.`)
    return
  }

  const rows = loadRows(opts)
  const total = rows.length
  const writesPerGoat = opts.withDevices ? 2 : 1
  console.log(`Farm:            ${opts.farmUid}`)
  console.log(`Goats to write:  ${total}`)
  console.log(`Devices:         ${opts.withDevices ? total : 'none'}`)
  console.log(`Total writes:    ${total * writesPerGoat} (batch size ${opts.batchSize / writesPerGoat} goats)`)

  if (opts.dryRun) {
    console.log('\n--- DRY RUN (sample rows, no writes) ---')
    rows.slice(0, 5).forEach((row, i) => {
      console.log(JSON.stringify(buildGoatDoc(row, i, opts), null, 2))
    })
    return
  }

  const batchSize = Math.floor(opts.batchSize / writesPerGoat)
  const started = Date.now()
  let written = 0

  for (let start = 0; start < total; start += batchSize) {
    const chunk = rows.slice(start, start + batchSize)
    const batch = firestore.batch()
    chunk.forEach((row, offset) => {
      const i = start + offset
      const goatDoc = buildGoatDoc(row, i, opts)
      batch.set(firestore.collection('goats').doc(goatDoc.goatId), goatDoc, { mergeFields: GOAT_MERGE_FIELDS })
      if (opts.withDevices) {
        batch.set(firestore.collection('devices').doc(goatDoc.goatId), buildDeviceDoc(goatDoc), { merge: true })
      }
    })
    await commitWithRetry(batch)
    written += chunk.length
    const pct = ((written / total) * 100).toFixed(1)
    const elapsed = ((Date.now() - started) / 1000).toFixed(1)
    console.log(`  ${written}/${total} goats (${pct}%) in ${elapsed}s`)
  }

  console.log(`\nDone. ${written} goats written to 'goats'${opts.withDevices ? ` (+ ${written} devices to 'devices')` : ''} in ${((Date.now() - started) / 1000).toFixed(1)}s.`)
}

run().catch((err) => {
  console.error('\nImport failed:', err.message)
  process.exit(1)
})
