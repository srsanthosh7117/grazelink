import { Request, Response, NextFunction } from 'express';
import { adminDb } from '../config/firebase.js';

// Legacy shared secret — kept only as a fallback so existing collars
// flashed before per-device keys existed don't break immediately.
// New devices should always use the key issued when they were
// registered in the dashboard (stored on their `devices` document).
const LEGACY_KEY = process.env.DEVICE_API_KEY;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      device?: { id: string; farmUid: string; deviceId: string };
    }
  }
}

/**
 * Validates the `x-api-key` header against the per-device key stored on
 * that device's `devices/{id}` document. Each collar gets its own key at
 * registration time (see src/services/devices.ts on the frontend), so a
 * leaked key only exposes one collar — rotating it (regenerateDeviceApiKey)
 * invalidates the old one immediately.
 *
 * Set SKIP_DEVICE_AUTH=true in .env for local development against
 * un-provisioned test devices. This is never honored in production.
 */
export async function validateDevice(req: Request, res: Response, next: NextFunction) {
  const skipAuth = process.env.SKIP_DEVICE_AUTH === 'true' && process.env.NODE_ENV !== 'production';
  if (skipAuth) {
    return next();
  }

  // Firmware sends apiKey inside the JSON body (TrackerRecord::ToJson);
  // the x-api-key / Authorization headers are accepted as an alternative
  // for other clients.
  const apiKey = (req.headers['x-api-key'] || req.headers['authorization'] || req.body?.apiKey) as string | undefined;
  const deviceId = req.body?.deviceId as string | undefined;

  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing deviceId' });
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized: missing x-api-key header' });
  }

  try {
    const snap = await adminDb.collection('devices').where('deviceId', '==', deviceId).limit(1).get();

    if (!snap.empty) {
      const device = snap.docs[0];
      const data = device.data();

      if (data.apiKey && apiKey === data.apiKey) {
        req.device = { id: device.id, farmUid: data.farmUid, deviceId };
        return next();
      }

      return res.status(401).json({ error: 'Unauthorized: invalid device API key' });
    }

    // Device not yet registered in the dashboard — fall back to the
    // legacy shared key only if one is configured, so existing
    // installs keep working during migration.
    if (LEGACY_KEY && apiKey === LEGACY_KEY) {
      return next();
    }

    return res.status(401).json({
      error: 'Unauthorized: unknown device. Register this collar in the dashboard before it can upload telemetry.',
    });
  } catch (error) {
    console.error('Error validating device API key:', error);
    return res.status(500).json({ error: 'Internal error validating device' });
  }
}
