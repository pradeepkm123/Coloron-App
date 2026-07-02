const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    channelId: { type: Number },
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    snapshotUrl: { type: String },
    deviceName: { type: String },
    channelName: { type: String },
    read: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    features: { type: mongoose.Schema.Types.Mixed, default: {} }
});

module.exports = mongoose.model('Event', eventSchema);
