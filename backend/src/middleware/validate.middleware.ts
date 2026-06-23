import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from './auth.middleware.js';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const authReq = req as AuthRequest;
    const errorMessages = errors.array().map((e: any) => `${e.path || e.param}: ${e.msg}`).join(', ');

    // Log to server logs (visible in Settings > Logs)
    console.warn(`[Validation Error] ${req.method} ${req.originalUrl} - ${errorMessages} (User: ${authReq.user?.username || 'anonymous'})`);

    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};
