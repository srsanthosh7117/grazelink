import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { withTimeout } from '@/utils/withTimeout';

export interface RegisterPayload {
  username: string;
  fullName: string;
  email: string;
  password: string;
  farmName: string;
  farmAddress: string;
  numberOfSheds: number;
  phoneNumber: string;
  country: string;
  state: string;
  district: string;
  village: string;
  pincode: string;
}

/** Creates a Firebase Auth user, then stores the farm profile in Firestore. */
export async function registerUser(payload: RegisterPayload) {
  const credential = await withTimeout(
    createUserWithEmailAndPassword(auth, payload.email, payload.password),
    15000,
    'Account creation is taking too long. Please check your connection and try again.'
  );

  await withTimeout(
    updateProfile(credential.user, { displayName: payload.fullName }),
    15000,
    'Could not save your profile name. Please try again.'
  );

  await withTimeout(
    setDoc(doc(db, 'farms', credential.user.uid), {
      username: payload.username,
      fullName: payload.fullName,
      email: payload.email,
      farmName: payload.farmName,
      farmAddress: payload.farmAddress,
      numberOfSheds: payload.numberOfSheds,
      phoneNumber: payload.phoneNumber,
      country: payload.country,
      state: payload.state,
      district: payload.district,
      village: payload.village,
      pincode: payload.pincode,
      createdAt: serverTimestamp(),
    }),
    15000,
    'Could not save your farm details to the database. Please check your Firestore configuration and try again.'
  );

  return credential.user;
}

export async function loginUser(email: string, password: string, rememberMe = true) {
  // "Remember me" -> persist across sessions; otherwise keep it to the
  // current browser tab/session only.
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  const credential = await withTimeout(
    signInWithEmailAndPassword(auth, email, password),
    15000,
    'Login is taking too long. Please check your connection and try again.'
  );
  return credential.user;
}

/** Sends Firebase's password-reset email to the given address. */
export async function resetPassword(email: string) {
  await withTimeout(
    sendPasswordResetEmail(auth, email),
    15000,
    'Sending the reset email is taking too long. Please check your connection and try again.'
  );
}

/** Sends a Firebase email-verification link to the signed-in user.
 *  The continue URL is the live app (VITE_APP_URL, falling back to the
 *  current origin) so the email's button lands on the deployed site.
 *  handleCodeInApp:false keeps Firebase's hosted action handler in charge
 *  of marking the email verified — no extra app routing needed. */
export async function sendVerificationEmail(user: User) {
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  await withTimeout(
    sendEmailVerification(user, { url: appUrl, handleCodeInApp: false }),
    15000,
    'Sending the verification email is taking too long. Please check your connection and try again.'
  );
}

/**
 * Reloads the current Firebase user so `emailVerified` reflects any
 * verification that happened in another tab/device, and returns the
 * refreshed user.
 */
export async function refreshAuthUser(): Promise<User | null> {
  const current = auth.currentUser;
  if (current) {
    await withTimeout(
      reload(current),
      15000,
      'Could not refresh your session. Please check your connection and try again.'
    );
    return current;
  }
  return null;
}

export async function logoutUser() {
  await firebaseSignOut(auth);
}

export interface UpdateFarmProfilePayload {
  username?: string;
  fullName?: string;
  email?: string;
  farmName?: string;
  farmAddress?: string;
  numberOfSheds?: number;
  phoneNumber?: string;
  country?: string;
  state?: string;
  district?: string;
  village?: string;
  pincode?: string;
}

/** Updates an existing farm profile doc (merge, so createdAt is preserved). */
export async function updateFarmProfile(farmUid: string, payload: UpdateFarmProfilePayload) {
  await withTimeout(
    updateDoc(doc(db, 'farms', farmUid), { ...payload } as Record<string, unknown>),
    15000,
    'Could not save your farm details. Please check your connection and try again.'
  );
}
