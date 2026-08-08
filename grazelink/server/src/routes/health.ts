import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'GrazeLink Commercial IoT Ingestion Engine',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
