const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../modules/auth/user.model');

const protect = async (req, res, next) => {
    try {
        let token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        if (token.startsWith('Bearer ')) {
            token = token.split(' ')[1];
        }

        if (!token || token === 'null' || token === 'undefined') {
            console.warn('[Auth Middleware] Malformed token received:', token);
            return res.status(401).json({ message: 'Token malformed' });
        }

        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        next();
    } catch (error) {
        console.error('[Auth Middleware] JWT Error:', error.message);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

module.exports = { protect };
