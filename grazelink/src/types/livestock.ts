export interface Livestock {
  /** Firestore document id */
  id: string;

  // Identity
  livestockId: string;
  collarId: string;
  name: string;
  breed: string;
  gender: 'Male' | 'Female';
  age: number;
  weight: number;
  colour: string;
  dateOfBirth: string;
  healthStatus: string;
  vaccinationStatus: string;
  medicalNotes?: string;
  purchaseDate: string;
  farmName: string;
  shedName: string;
  owner: string;
  remarks?: string;

  // Farm linkage
  farmUid: string;

  // Device linkage
  deviceId?: string;

  // Telemetry — populated by the collar sync pipeline once the
  // device has reported in at least once. Absent/undefined until then.
  battery?: number | null;
  temperature?: number | null;
  signalStrength?: number | null;
  status?: 'Online' | 'Offline';
  gpsStatus?: 'Active' | 'Inactive' | 'No Signal';
  lastSeen?: string;
  lat?: number | null;
  lng?: number | null;

  createdAt?: unknown;
}

export type LivestockPayload = Omit<Livestock, 'id' | 'createdAt'>;
