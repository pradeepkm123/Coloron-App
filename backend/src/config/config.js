require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vms_app',
    jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key',
    jwtExpiration: process.env.JWT_EXPIRATION || '7d',
};

module.exports = config;
