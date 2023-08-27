const bcrypt = require('bcrypt');

const saltRounds = 10; // The cost factor controls the amount of time needed to calculate a single BCrypt hash
const plainTextPassword = 'my-password'; // Replace with the user's password

bcrypt.hash(plainTextPassword, saltRounds, function(err, hash) {
    console.log(hash); // This will print the hashed password
});
