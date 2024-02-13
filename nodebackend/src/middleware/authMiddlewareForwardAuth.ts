// authMiddlewareForwardAuth.ts
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

const authMiddlewareForwardAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.ip;
    
    // Attempt to extract the token from the 'forwardAuthToken' cookie
    const token = req.cookies['forwardAuthToken'];

    if (!token) {
      logger.warn(`Authentication failed from IP ${clientIp}: No forwardAuthToken cookie provided`);
      return res.status(401).send("Authentication failed: No token provided");
    }

    const jwtSecret = await getJwtAccessTokenSecret();

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        logger.warn(`Invalid JWT token from IP ${clientIp}`);
        return res.status(401).send("Authentication failed: Invalid token");
      }

      const payload = decoded as TokenPayload;
      req.user = payload; // Optionally set user info in the request for downstream use

      next(); // Proceed to the next middleware if the token is valid
    });
  } catch (error) {
    logger.error(`Error in authentication middleware: ${error}`);
    return res.status(500).send("Internal server error");
  }
};

export default authMiddlewareForwardAuth;
