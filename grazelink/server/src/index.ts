import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import deviceRouter from './routes/device.js';
import healthRouter from './routes/health.js';
import { startOfflineMonitor } from './services/offlineMonitor.js';

dotenv.config();

const app = express();
// Render (and most hosts) sit the app behind a reverse proxy that adds
// X-Forwarded-For; without this, express-rate-limit throws trying to
// identify the real client IP.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Security & Logging Middlewares
app.use(helmet());

// CORS is browser-enforced only; the ESP32 firmware calls this API directly
// over TLS, so it is unaffected by these settings. The allowlist exists to
// stop a random website from issuing credentialed requests to this backend on
// behalf of a logged-in dashboard user.
const defaultOrigins = [
  'https://srsanthosh7117.github.io',            // production dashboard (GitHub Pages)
  'http://localhost:5173',                      // vite dev server
  'http://127.0.0.1:5173',
];
const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(','))
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiter — 100 requests per minute per IP for IoT stability
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', limiter);

// Mount Routes
app.use('/api/device', deviceRouter);
app.use('/api/health', healthRouter);

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'GrazeLink Commercial IoT Ingestion API',
    version: '1.0.0',
    documentation: 'POST /api/device/upload',
  });
});

app.listen(PORT, () => {
  console.log(`⚡ GrazeLink IoT Backend Server running on port ${PORT}`);
});

// Background job: flag collars that have stopped reporting (deviceOffline alerts)
if (process.env.DISABLE_OFFLINE_MONITOR !== 'true') {
  startOfflineMonitor();
}
