import express, { Request, Response } from 'express';
import logger from '../logger';

const router = express.Router();

router.post('/', (req: Request, res: Response) => {
    if (req.body) {
        logger.warn('CSP Violation:', req.body);
    } else {
        logger.warn('CSP Violation: No data received!');
    }
    res.status(204).end();
});

export default router;
