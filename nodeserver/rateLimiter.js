const rateLimit = require("express-rate-limit");

const ratelimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
});

module.exports = ratelimiter;