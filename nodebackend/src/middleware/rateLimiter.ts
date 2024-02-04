import rateLimit from "express-rate-limit";
import { Request, Response } from 'express';
import logger from '../logger'; 

function createRateLimiter(windowMs: number, max: number, message: string) {
    return rateLimit({
        windowMs,
        max,
        message,
        handler: (req: Request, res: Response) => {

            const clientIp = req.ip || 'Unknown IP'; // Get client's IP address
            logger.warn(`Rate limit exceeded for IP ${clientIp}, Endpoint: ${req.originalUrl}`);
            res.status(429).send(message);
        }
    });
}

const loginLimiter = createRateLimiter(15 * 60 * 1000, 100, 'tooManyLoginAttempts');
const apiLimiter = createRateLimiter(1 * 60 * 1000, 1000, 'tooManyRequests');

export {
    loginLimiter,
    apiLimiter
};
