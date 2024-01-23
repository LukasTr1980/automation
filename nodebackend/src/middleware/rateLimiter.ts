import rateLimit from "express-rate-limit";
import { Request, Response } from 'express';
import logger from '../logger'; // Ensure your logger is imported

function createRateLimiter(windowMs: number, max: number, message: string) {
    return rateLimit({
        windowMs,
        max,
        message,
        handler: (req: Request, res: Response) => {
            // Log rate limit exceeded event here
            const clientIp = req.ip || 'Unknown IP'; // Get client's IP address
            logger.warn(`Rate limit exceeded for IP ${clientIp}, Endpoint: ${req.originalUrl}`);
            res.status(429).send(message);
        }
        // onLimitReached removed as it's deprecated in express-rate-limit v7
    });
}

const loginLimiter = createRateLimiter(15 * 60 * 1000, 100, 'tooManyLoginAttempts');
const apiLimiter = createRateLimiter(1 * 60 * 1000, 1000, 'tooManyRequests');

export {
    loginLimiter,
    apiLimiter
};
