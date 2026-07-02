const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: function() { return this.loginType === 'local'; },
        unique: true,
        sparse: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    mobileNo: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
    },
    password: {
        type: String,
        required: function() { return this.loginType === 'local'; },
        minlength: 6,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    loginType: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
    },
    profilePicture: {
        type: String,
        default: '',
    },
    resetPasswordOTP: String,
    resetPasswordExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now,
    },
    fcmToken: {
        type: String,
        default: '',
    },
    subscribedDeviceIds: [{
        type: String,
    }],
    pushSettings: [{
        deviceId: String,
        enabled: Boolean,
        global: Object,
        system: Object,
        channels: [{
            channelId: Number,
            human: Boolean,
            vehicle: Boolean,
            faceDet: Boolean,
            faceRec: Boolean,
            intrusion: Boolean,
            line: Boolean,
            loitering: Boolean,
            crowd: Boolean,
            tamper: Boolean,
            motion: Boolean,
            sensor: Boolean,
        }]
    }]
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
