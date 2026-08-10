export type AlertType =
  | 'lowBattery'
  | 'deviceOffline'
  | 'noGps'
  | 'highTemperature'
  | 'vaccinationDue'
  | 'geofenceBreach';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  /** Firestore document id */
  id: string;

  type: AlertType;
  severity: AlertSeverity;
  message: string;

  livestockId?: string;
  deviceId?: string;
  farmUid: string;

  read: boolean;
  dismissed: boolean;

  createdAt?: unknown;
}

export const ALERT_LABELS: Record<AlertType, string> = {
  lowBattery: 'Low Battery',
  deviceOffline: 'Device Offline',
  noGps: 'No GPS Signal',
  highTemperature: 'High Temperature',
  vaccinationDue: 'Vaccination Due',
  geofenceBreach: 'Geofence Breach',
};

export const ALERT_COLORS: Record<AlertSeverity, string> = {
  info: 'text-blue-500 bg-blue-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  critical: 'text-red-500 bg-red-500/10',
};
