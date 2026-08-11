import { FirebaseError } from 'firebase/app';

/**
 * Firebase throws a FirebaseError with a stable `.code` like
 * "auth/email-already-in-use". Always log the raw error while debugging,
 * and use this to turn the code into something safe to show the user.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
  'auth/invalid-email': "That doesn't look like a valid email address.",
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/network-request-failed': 'Network error — check your internet connection and try again.',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'App configuration error (invalid API key).',
  'auth/invalid-api-key': 'App configuration error (invalid API key).',
  'auth/configuration-not-found': "Email/Password sign-in isn't enabled for this project.",
  'auth/operation-not-allowed': "Email/Password sign-in isn't enabled for this project.",
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/too-many-requests': 'Too many attempts — please wait a moment and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/invalid-action-code': 'This verification link is invalid or has already been used. Request a new one.',
  'auth/expired-action-code': 'This verification link has expired. Request a new one.',
  'auth/missing-action-code': 'This link is missing its verification code. Use the link from the email.',
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    // Log the real thing every time — this is what you check in DevTools.
    console.error('Firebase auth error:', error.code, error.message);
    return AUTH_ERROR_MESSAGES[error.code] ?? `Something went wrong (${error.code}). Please try again.`;
  }

  if (error instanceof Error) {
    console.error('Unexpected error:', error);
    return error.message || 'Something went wrong. Please try again.';
  }

  console.error('Unexpected error:', error);
  return 'Something went wrong. Please try again.';
}
