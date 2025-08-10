import express, { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken'; // Import JwtPayload for type extension
import logger from '../logger.js';
import { getJwtAccessTokenSecret } from '../configs.js';

const router = express.Router();

interface MyJwtPayload extends JwtPayload {
  role?: string;
}

router.post('/', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; 
  const { requiredRole } = req.body;

  if (!token) {
    logger.error('No token provided.');
    res.status(401).json({ message: 'tokenMissing', severity: 'warning' });
    return;
  }

  try {
    const jwtSecret = await getJwtAccessTokenSecret();

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        logger.warn(`JWT verification failed: ${err.message}`);
        return res.status(401).json({ message: 'invalidOrExpiredToken', severity: 'warning' });
      }

      const payload = decoded as MyJwtPayload;

      if (requiredRole && payload.role !== requiredRole) {
        logger.warn(`Unauthorized role: Expected ${requiredRole}, but got ${payload.role}`);
        return res.status(403).json({ message: 'forbiddenYouDontHavePermission', severity: 'warning' });
      }

      res.status(200).json({ status: 'success', message: 'validToken' });
    });
  } catch (error) {
    logger.error(`An error occurred during JWT verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ message: 'internalServerError', severity: 'error' });
  }
});

export default router;
