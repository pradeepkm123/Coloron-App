const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend directory first, then fallback to current working directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vms_app',
    jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key',
    jwtExpiration: process.env.JWT_EXPIRATION || '7d',
};

module.exports = config;
