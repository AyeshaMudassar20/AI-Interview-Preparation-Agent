const jwt = require('jsonwebtoken');

function protectRoute(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'Not authorized. Token missing.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.userId };
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized. Token invalid.' });
    }
}

module.exports = protectRoute;
