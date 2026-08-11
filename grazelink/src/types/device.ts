export interface Device {
  /** Firestore document id */
  id: string;

  deviceId: string;
  collarId?: string;
  livestockId?: string;
  livestockDocId?: string;
  farmUid: string;
  farmName?: string;
  shedName?: string;

  /** Per-device shared secret the collar firmware sends as the x-api-key
   *  header on every telemetry upload. Present only on devices registered
   *  before key-hashing shipped (see apiKeyHash); the backend verifies the
   *  presented key against either field. */
  apiKey?: string;

  /** SHA-256 digest of the device API key. New registrations and rotations
   *  store only this digest, never the plaintext key. */
  apiKeyHash?: string;

  /** GPS registration handshake state. A freshly registered collar starts
   *  'pending' and is only 'gps_confirmed' once the collar POSTed its
   *  first live fix to /api/device/location. Collars cannot be linked to
   *  a livestock until confirmed. */
  registrationStatus?: 'pending' | 'gps_confirmed';
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  registeredAt?: unknown;

  firmwareVersion: string;
  battery: number;
  wifiSignal: number;
  temperature: number;

  lastSync: string;
  status: 'Online' | 'Offline';

  createdAt?: unknown;
}

export type DevicePayload = Omit<Device, 'id' | 'createdAt' | 'apiKey'>;
