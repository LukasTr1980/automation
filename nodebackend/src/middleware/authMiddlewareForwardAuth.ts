import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import logger from '../logger';
import { getJwtAccessTokenSecret } from '../configs';

interface TokenPayload extends JwtPayload {
  username: string;
  role: string;
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

    jwt.verify(token, jwtSecret, (err: Error | null, decoded: JwtPayload | undefined) => {
      if (err) {
        logger.warn(`Invalid forwardAuthToken token from IP ${clientIp}`);
        return res.status(401).send("Authentication failed: Invalid forwardAuthToken");
      }

      const payload = decoded as TokenPayload;
      if (!payload.username || !payload.role) {
        return res.status(401).send("Authentication failed: forwardAuthToken is missing required claims");
      }

      req.user = payload;
      next();
    });
  } catch (error) {
    logger.error(`Error in forwardAuthToken authentication middleware: ${error}`);
    return res.status(500).send("Internal server error");
  }
};

export default authMiddlewareForwardAuth;
