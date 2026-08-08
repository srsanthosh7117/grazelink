/**
 * Races a promise against a timeout so the UI never gets stuck on a
 * spinner forever (e.g. if Firebase can't reach the network, or the
 * project config in .env is missing/incorrect).
 */
export function withTimeout<T>(promise: Promise<T>, ms = 15000, message = 'This is taking longer than expected. Please check your internet connection and try again.'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}
