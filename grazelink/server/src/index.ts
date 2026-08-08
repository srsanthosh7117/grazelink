import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import deviceRouter from './routes/device.js';
import healthRouter from './routes/health.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Logging Middlewares
app.use(helmet());
app.use(cors());
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
