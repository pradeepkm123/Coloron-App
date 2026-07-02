const admin = require('firebase-admin');
const path = require('path');

try {
    const serviceAccount = require('../../serviceAccountKey.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ Firebase Admin initialized');
} catch (error) {
    console.warn('⚠️ Firebase Admin initialization failed (Check serviceAccountKey.json):', error.message);
}

module.exports = admin;
