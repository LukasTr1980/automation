import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../logger.js';
import { getJwtAccessTokenSecret } from '../configs.js';

interface TokenPayload {
  username: string;
  role: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      username: string;
      role: string;
    }
  }
}

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.ip;

    const token = req.cookies['forwardAuthToken'];

    if (!token) {
      logger.warn(`Authentication failed from IP ${clientIp}: No forwardAuthToken cookie provided`);
      return res.status(401).send("Authentication failed: No forwardAuthToken provided");
    }

    const jwtSecret = await getJwtAccessTokenSecret();

    jwt.verify(token, jwtSecret, (err: Error | null, decoded: object | unknown) => {
      if (err) {
        logger.warn(`Invalid forwardAuthToken from IP ${clientIp}`);
        return res.status(401).send("Authentication failed: Invalid forwardAuthToken");
      }

      const payload = decoded as TokenPayload;
      req.user = payload; 

      next();
    });
  } catch (error) {
    logger.error(`Error in authentication middleware: ${error}`);
    return res.status(500).send("Internal server error");
  }
};

export default authMiddleware;
