import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID || 'dashboard-47a1c';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

// Tolerate the private key in any common format: bare PEM, `\n`-escaped
// (dotenv/JSON style), or surrounded by quotes as in a .env file.
function cleanPrivateKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  let key = raw.replace(/\\n/g, '\n').trim();
  if (key.startsWith('"') && key.endsWith('"') && key.length >= 2) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

if (!getApps().length) {
  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Fallback initializing with default application credentials
    initializeApp({
      projectId,
    });
  }
}

export const adminDb = getFirestore();
