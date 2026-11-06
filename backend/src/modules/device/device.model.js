const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true },
    online: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    aiFeatures: [String], // e.g. ["FACE", "HUMAN", "VEHICLE", "PLATE"]
    presets: [{
        id: { type: Number },
        name: { type: String }
    }],
    channelNo: { type: Number },
    channelName: { type: String },
    isConfigured: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    cameraId: { type: String },
    ipAddress: { type: String },
    model: { type: String },
    ptz: { type: Boolean, default: false },
    ptzSupport: { type: Boolean, default: false },
    ptzSupported: { type: Boolean, default: false },
    cameraType: { type: String, default: 'IPC' },
});

const deviceSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['NVR', 'IPC', 'DVR'], default: 'NVR' },
    ip: { type: String, required: true },
    port: { type: Number, required: true },
    status: { type: String, enum: ['Online', 'Offline', 'Connecting'], default: 'Offline' },
    favorite: { type: Boolean, default: false },
    deviceId: { type: String }, // SN
    username: { type: String },
    password: { type: String },
    channelCount: { type: Number },
    maxChannelCount: { type: Number },
    addedChannelCount: { type: Number },
    onlineChannelCount: { type: Number },
    lastChannelSyncAt: { type: Date },
    connectMode: { type: String, enum: ['LAN', 'P2P', 'IP', 'Domain'], default: 'LAN' },
    isNVR: { type: Boolean, default: true },
    protocol: { type: String, default: 'TVT' },
    pushEnabled: { type: Boolean, default: true },
    userEmail: { type: String, required: true }, // Owner identification
    channels: [channelSchema]
}, { timestamps: true });

// Compound unique index for id + userEmail to support multiple accounts adding the same device
deviceSchema.index({ id: 1, userEmail: 1 }, { unique: true });

// Drop the old global unique index if it exists
mongoose.connection.once('open', async () => {
    try {
        await mongoose.connection.db.collection('devices').dropIndex('id_1');
        console.log('[Device Model] Successfully dropped old unique id index');
    } catch (e) {
        // Index might not exist or already dropped
    }
});

module.exports = mongoose.model('Device', deviceSchema);
