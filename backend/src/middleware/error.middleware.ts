import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const authReq = req as AuthRequest;

  if (err instanceof AppError) {
    // Log permission denied errors (401/403) to server logs
    if (err.statusCode === 401 || err.statusCode === 403) {
      console.warn(`[Permission Denied] ${req.method} ${req.originalUrl} - ${err.message} (User: ${authReq.user?.username || 'anonymous'})`);
    }

    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Log server errors to server logs
  console.error(`[API Error] ${req.method} ${req.originalUrl} - ${err.message} (User: ${authReq.user?.username || 'anonymous'})`);

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error'
  });
};
