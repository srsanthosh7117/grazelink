// Firebase initialization
// Fill in your project's config values in a .env file (see .env.example)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// App Check — hardens Firestore/Auth access to requests signed by this app,
// so a leaked web API key can't be replayed by bots/scripts.
// It stays dormant until VITE_RECAPTCHA_SITE_KEY is set in the build env
// (Netlify) AND enforcement is enabled in Firebase console → App Check.
// The site key comes from a reCAPTCHA Enterprise key created in that console.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
export const appCheck: AppCheck | null = recaptchaSiteKey
  ? initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null;
export default app;
