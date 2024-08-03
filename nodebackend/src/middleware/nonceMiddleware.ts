import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../logger';

export const nonceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  logger.debug(`Generated CSP nonce: ${res.locals.cspNonce}`);
  next();
};
