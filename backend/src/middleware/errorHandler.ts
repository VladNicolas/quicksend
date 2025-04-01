import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

/**
 * Custom error handler middleware
 */
const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
};

export default errorHandler; 