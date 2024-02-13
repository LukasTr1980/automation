import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken'; // Note the JwtPayload import for typing
import logger from '../logger';
import { getJwtAccessTokenSecret } from '../configs';

interface TokenPayload extends JwtPayload {
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const authMiddlewareForwardAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.ip;
    
    const token = req.cookies['forwardAuthToken'];

    if (!token) {
      logger.warn(`Authentication failed from IP ${clientIp}: No forwardAuthToken cookie provided`);
      return res.status(401).send("Authentication failed: No token provided");
    }

    const jwtSecret = await getJwtAccessTokenSecret();

    jwt.verify(token, jwtSecret, (err: Error | null, decoded: object | undefined) => {
      if (err) {
        logger.warn(`Invalid JWT token from IP ${clientIp}`);
        return res.status(401).send("Authentication failed: Invalid token");
      }

      // Ensure 'decoded' is not undefined and is a TokenPayload
      if (decoded && typeof decoded === 'object') {
        const payload = decoded as TokenPayload;
        req.user = payload;
        next();
      } else {
        return res.status(401).send("Authentication failed: Decoding failed");
      }
    });
  } catch (error) {
    logger.error(`Error in authentication middleware: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).send("Internal server error");
  }
};

export default authMiddlewareForwardAuth;
