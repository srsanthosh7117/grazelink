export interface Device {
  /** Firestore document id */
  id: string;

  deviceId: string;
  collarId?: string;
  goatId?: string;
  goatDocId?: string;
  farmUid: string;
  farmName?: string;
  shedName?: string;

  /** Per-device shared secret the collar firmware sends as the x-api-key
   *  header on every telemetry upload. Generated client-side on
   *  registration; only ever readable by the owning farm. */
  apiKey: string;

  /** GPS registration handshake state. A freshly registered collar starts
   *  'pending' and is only 'gps_confirmed' once the collar POSTed its
   *  first live fix to /api/device/location. Collars cannot be linked to
   *  a goat until confirmed. */
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
