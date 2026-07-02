const mongoose = require('mongoose');

const pushSettingSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    eventType: { type: String, required: true },
    channels: [{ type: Number }],
    enabled: { type: Boolean, default: true },
    userEmail: { type: String }
}, { timestamps: true });

pushSettingSchema.index({ deviceId: 1, eventType: 1, userEmail: 1 }, { unique: true });

module.exports = mongoose.model('PushSetting', pushSettingSchema);
