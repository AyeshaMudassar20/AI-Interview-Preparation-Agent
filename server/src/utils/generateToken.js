const jwt = require('jsonwebtoken');

function generateToken(userId, jwtSecret) {
    return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });
}

module.exports = generateToken;
