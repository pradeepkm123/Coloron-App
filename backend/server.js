const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./src/utils/db');
const config = require('./src/config/config');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); // Enable CORS for React Native
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger

// Request logger for debugging
app.use((req, res, next) => {
    console.log(`[Backend] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', require('./src/modules/auth/auth.routes'));
app.use('/api/devices', require('./src/modules/device/device.routes'));
app.use('/api/device', require('./src/modules/device/device.routes')); // Alias for compatibility
app.use('/api/push-settings', require('./src/modules/pushSetting/pushSetting.routes'));
app.use('/api/events', require('./src/modules/event/event.routes'));
app.use('/api/media', require('./src/modules/media/media.routes'));

// Help PDF download/view route
app.get('/help.pdf', (req, res) => {
    const path = require('path');
    const pdfPath = path.join(__dirname, '..', 'App File.pdf');
    const fs = require('fs');
    if (fs.existsSync(pdfPath)) {
        res.sendFile(pdfPath);
    } else {
        res.status(404).json({ message: 'Help PDF not found on server' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    const mongoose = require('mongoose');
    res.json({ 
        status: 'ok', 
        message: 'VMS Backend is running',
        dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        dbReadyState: mongoose.connection.readyState
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: config.env === 'development' ? err.message : undefined
    });
});

// Start server — bind to 0.0.0.0 so LAN devices (phones) can reach this server
const PORT = config.port;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VMS Backend running on http://0.0.0.0:${PORT} (accessible from LAN)`);
    
    // Detect and log local IPv4 addresses
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    if (ips.length > 0) {
        console.log('   → Detected LAN IPs (use one of these in your app/emulator configuration):');
        ips.forEach(ip => {
            console.log(`     - http://${ip}:${PORT}`);
        });
        try {
            const fs = require('fs');
            const path = require('path');
            fs.writeFileSync(path.join(__dirname, 'detected_ips.txt'), ips.join('\n'), 'utf8');
        } catch (e) {
            console.error('Error writing IP file:', e);
        }
    } else {
        console.log(`   → From phone use: http://<YOUR_PC_LAN_IP>:${PORT}`);
    }
});

// TEMPORARY DUMP
try {
    const fs = require('fs');
    const path = require('path');
    const callbackFile = path.join(__dirname, '..', 'nvrsdkcallback.txt');
    if (fs.existsSync(callbackFile)) {
        const content = fs.readFileSync(callbackFile, 'utf16le');
        fs.writeFileSync(path.join(__dirname, 'converted_callback.txt'), content, 'utf8');
    }
} catch (e) {
    fs.writeFileSync(path.join(__dirname, 'converter_error.txt'), e.stack, 'utf8');
}

// TEMPORARY DUMP 2
try {
    const fs = require('fs');
    const path = require('path');
    const execSync = require('child_process').execSync;
    const baseDir = path.join(__dirname, '..', 'android', 'app', 'libs');
    
    // Find class file recursively
    function findClassFile(dir, className) {
        if (!fs.existsSync(dir)) return null;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const res = findClassFile(fullPath, className);
                if (res) return res;
            } else if (file === className + '.class') {
                return fullPath;
            }
        }
        return null;
    }
    
    const classFile = path.join(__dirname, '..', 'android', 'app', 'libs', 'nvrsdk_javap.txt');
    if (fs.existsSync(classFile)) {
        const content = fs.readFileSync(classFile, 'utf16le');
        const lines = content.split('\n');
        let output = '';
        lines.forEach((line, index) => {
            if (/callback/i.test(line)) {
                output += `${index + 1}: ${line.trim()}\n`;
            }
        });
        fs.writeFileSync(path.join(__dirname, 'converted_callback_methods.txt'), output, 'utf8');
    } else {
        fs.writeFileSync(path.join(__dirname, 'converted_callback_methods.txt'), 'nvrsdk_javap.txt not found', 'utf8');
    }
} catch (e) {
    fs.writeFileSync(path.join(__dirname, 'converted_callback_methods.txt'), 'Error: ' + e.stack, 'utf8');
}

