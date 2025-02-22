import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../logger';
import { getJwtAccessTokenSecret } from '../configs';

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
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      token = req.query.token as string | undefined;
    }

    if (!token) {
      logger.warn(`Authentication failed from IP ${clientIp}: No JWT token provided`);
      res.status(401).send("Authentication failed: No token provided");
      return;
    }

    const jwtSecret = await getJwtAccessTokenSecret();

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        logger.warn(`Invalid JWT token from IP ${clientIp}`);
        res.status(401).send("Authentication failed: Invalid token");
        return;
      }

      const payload = decoded as TokenPayload;
      req.user = payload; 

      next();
    });
  } catch (error) {
    logger.error(`Error in authentication middleware: ${error}`);
    res.status(500).send("Internal server error");
    return;
  }
};

export default authMiddleware;
