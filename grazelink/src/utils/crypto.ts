/** SHA-256 hex digest using the Web Crypto API.
 *  Device API keys are stored at rest only as their digest — the plaintext
 *  is shown to the owner once at registration/rotation and never written to
 *  Firestore, so a database leak cannot be replayed to impersonate a collar. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
