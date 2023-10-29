const express = require('express');
const router = express.Router();
const { loginValidation } = require('../inputValidation');
const { connectToRedis } = require('../redisClient');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

router.post('/', async (req, res) => {
    const { error } = loginValidation(req.body);
    if (error) return res.status(400).json({ status: 'error', message: error.details[0].message });
  
    const { username, password } = req.body;
  
    const redis = await connectToRedis();
  
    const storedHashedPassword = await redis.get(`user:${username}`);
  
    // Check if the username exists
    if (!storedHashedPassword) {
      return res.status(401).json({ status: 'error', message: 'Falscher Benutzername oder Password.' });
    }
  
    // Compare input password with stored hashed password
    bcrypt.compare(password, storedHashedPassword, async function (err, result) {
      if (result) {
        // If the password is correct, generate a session ID
        const sessionId = crypto.randomBytes(16).toString('hex');
  
        // Get the Redis client
        const redis = await connectToRedis();
  
        // Store it in Redis with the username as the key and the session ID as the value
        await redis.set(`session:${sessionId}`, username, 'EX', 86400);
  
        // Send it back to the client
        res.status(200).json({ status: 'success', session: sessionId });
      } else {
        res.status(401).json({ status: 'error', message: 'Falscher Benutzername oder Password.' });
      }
    });
  });

module.exports = router;