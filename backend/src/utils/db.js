const mongoose = require('mongoose');
const dns = require('dns');
const config = require('../config/config');

const connectDB = async () => {
    // If using MongoDB Atlas SRV URI on Windows, set reliable DNS resolvers to avoid ECONNREFUSED
    if (config.mongoUri && config.mongoUri.includes('mongodb+srv')) {
        try {
            dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
        } catch (e) {
            console.warn('[DB] Could not set custom DNS servers:', e.message);
        }
    }

    try {
        const conn = await mongoose.connect(config.mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 8000,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`⚠️ MongoDB Connection Error (${config.mongoUri}): ${error.message}`);

        // If remote Atlas failed, attempt local fallback if running
        if (!config.mongoUri.includes('127.0.0.1') && !config.mongoUri.includes('localhost')) {
            console.log('🔄 Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/vms_app)...');
            try {
                const conn = await mongoose.connect('mongodb://127.0.0.1:27017/vms_app', {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    serverSelectionTimeoutMS: 3000,
                });
                console.log(`✅ Connected to local MongoDB: ${conn.connection.host}`);
                return;
            } catch (localErr) {
                console.warn(`⚠️ Local MongoDB fallback also not available: ${localErr.message}`);
            }
        }
        console.warn('⚠️ Server will continue running without MongoDB. API endpoints that require DB will return 500 until DB is available.');
    }
};

module.exports = connectDB;
