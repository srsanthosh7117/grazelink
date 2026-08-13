import { Request, Response, NextFunction } from 'express';

export interface TelemetryPayload {
  deviceId: string;
  collarId?: string;
  livestockId: string;
  /** Legacy field name sent by collars flashed before the rename. */
  goatId?: string;
  latitude: number;
  longitude: number;
  battery: number;
  temperature?: number;
  signalStrength?: number;
  timestamp?: string;
  speed?: number;
  apiKey?: string;
  gpsStatus?: string;
  /** Receiver's own horizontal accuracy estimate in metres (UBX-NAV-PVT hAcc). */
  gpsAccuracy?: number;
  /** Satellites used in the solution. */
  satellites?: number;
  movement?: boolean;
}

export function validatePayload(req: Request, res: Response, next: NextFunction) {
  const { deviceId, latitude, longitude, battery } = req.body;

  // Normalise the livestock identifier, accepting the legacy `goatId` key so
  // already-flashed collars keep reporting without a firmware update.
  const livestockId =
    typeof req.body.livestockId === 'string' && req.body.livestockId.trim() !== ''
      ? req.body.livestockId
      : req.body.goatId;

  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing deviceId' });
  }
  if (!livestockId || typeof livestockId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing livestockId' });
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

  // Surface the normalised id on the body for downstream handlers.
  req.body.livestockId = livestockId;
  next();
}
