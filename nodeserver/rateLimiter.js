const rateLimit = require("express-rate-limit");
const logger = require('../shared/build/logger').default; // Ensure your logger is required

function createRateLimiter(windowMs, max, message) {
    return rateLimit({
        windowMs,
        max,
        message,
        handler: (req, res, /* next, */ options) => {
            // Log rate limit exceeded event here
            const clientIp = req.ip || 'Unknown IP'; // Get client's IP address
            logger.warn(`Rate limit exceeded for IP ${clientIp}, Endpoint: ${req.originalUrl}`);
            res.status(options.statusCode).send(options.message);
        }
        // onLimitReached removed as it's deprecated in express-rate-limit v7
    });
}

const loginLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many login attempts from this IP, please try again after 15 minutes.');
const apiLimiter = createRateLimiter(1 * 60 * 1000, 1000, 'Too many requests from this IP, please try again after a minute.');

module.exports = {
    loginLimiter,
    apiLimiter
};
