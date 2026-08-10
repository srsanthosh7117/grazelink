export interface GpsHistoryEntry {
  /** Firestore document id */
  id: string;

  latitude: number;
  longitude: number;
  speed?: number;
  battery: number;
  temperature?: number;
  signalStrength?: number;

  timestamp: string;
  deviceId: string;
  livestockId: string;
  farmUid: string;

  createdAt?: unknown;
}
