import { Request, Response, NextFunction } from 'express';

export interface TelemetryPayload {
  deviceId: string;
  collarId: string;
  goatId: string;
  latitude: number;
  longitude: number;
  battery: number;
  temperature: number;
  signalStrength: number;
  timestamp: string;
  speed?: number;
}

export function validatePayload(req: Request, res: Response, next: NextFunction) {
  const { deviceId, collarId, goatId, latitude, longitude, battery, temperature, signalStrength } = req.body;

  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing deviceId' });
  }
  if (!collarId || typeof collarId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing collarId' });
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
  if (typeof temperature !== 'number') {
    return res.status(400).json({ error: 'Invalid or missing temperature' });
  }
  if (typeof signalStrength !== 'number') {
    return res.status(400).json({ error: 'Invalid or missing signalStrength' });
  }

  next();
}
