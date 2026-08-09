import { Request, Response, NextFunction } from 'express';

export interface TelemetryPayload {
  deviceId: string;
  collarId?: string;
  goatId: string;
  latitude: number;
  longitude: number;
  battery: number;
  temperature?: number;
  signalStrength?: number;
  timestamp?: string;
  speed?: number;
  apiKey?: string;
  gpsStatus?: string;
  gpsAccuracy?: number;
  movement?: boolean;
}

export function validatePayload(req: Request, res: Response, next: NextFunction) {
  const { deviceId, goatId, latitude, longitude, battery } = req.body;

  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing deviceId' });
  }
  if (!goatId || typeof goatId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing goatId' });
  }
  if (typeof latitude !== 'number' || isNaN(latitude)) {
    return res.status(400).json({ error: 'Invalid or missing latitude' });
  }
  if (typeof longitude !== 'number' || isNaN(longitude)) {
    return res.status(400).json({ error: 'Invalid or missing longitude' });
  }
  if (typeof battery !== 'number' || battery < 0 || battery > 100) {
    return res.status(400).json({ error: 'Invalid battery percentage (0-100 expected)' });
  }

  next();
}
