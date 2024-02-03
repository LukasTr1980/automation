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
      return res.status(401).send("Authentication failed: No token provided");
    }

    const jwtSecret = await getJwtAccessTokenSecret();

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        logger.warn(`Invalid JWT token from IP ${clientIp}`);
        return res.status(401).send("Authentication failed: Invalid token");
      }

      // Attach user details to the request object
      const payload = decoded as TokenPayload;
      req.user = payload; // This now includes username and role

      next();
    });
  } catch (error) {
    logger.error(`Error in authentication middleware: ${error}`);
    return res.status(500).send("Internal server error");
  }
};

export default authMiddleware;
