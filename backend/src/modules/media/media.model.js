const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['snapshot', 'recording'],
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    channelId: {
        type: Number,
        required: true
    },
    deviceName: {
        type: String,
        required: true
    },
    thumbnailPath: {
        type: String
    },
    userEmail: {
        type: String
    },
    userId: {
        type: mongoose.Schema.Types.Mixed
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Media', mediaSchema);
