const express = require('express');
const router = express.Router();
const { signup, login, googleLogin, updateProfile, forgotPassword, verifyOTP, resetPassword, registerFcmToken } = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleLogin);
router.put('/profile', protect, updateProfile);
router.post('/register-fcm', protect, registerFcmToken);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
