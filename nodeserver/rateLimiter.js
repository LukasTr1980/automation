const rateLimit = require("express-rate-limit");

function createRateLimiter(windowsMs, max, message) {
    return rateLimit({
        windowsMs,
        max,
        message
    });
}

const loginLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many login attempts from this IP, please try again after 15 minutes.');
const apiLimiter = createRateLimiter(1 * 60 * 1000, 1000, 'Too many requests from this IP, please try again after a minute.');


module.exports = {
    loginLimiter,
    apiLimiter
}