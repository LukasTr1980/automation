const bcrypt = require('bcrypt');
const logger = require('../shared/build/logger').default;

const saltRounds = 10; // The cost factor controls the amount of time needed to calculate a single BCrypt hash
const plainTextPassword = 'pwd'; // Replace with the user's password

bcrypt.hash(plainTextPassword, saltRounds, function(err, hash) {
    logger.info(hash); // This will print the hashed password
});
