const jwt = require('jsonwebtoken');
const User = require('./user.model');
const config = require('../../config/config');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client();

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, config.jwtSecret, {
        expiresIn: config.jwtExpiration,
    });
};

// Strong Password Validator Helper
const isPasswordStrong = (password) => {
    if (!password || password.length < 8) return false;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
    try {
        const { username, email, mobileNo, password } = req.body;

        // Validate required fields
        if (!username || !email || !mobileNo || !password) {
            return res.status(400).json({ message: 'Please provide all required fields (username, email, mobile, password)' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email' });
        }

        // Validate password strength
        if (!isPasswordStrong(password)) {
            return res.status(400).json({ message: 'Password is too weak. It must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
        }

        // Check if email already exists
        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Check if mobile matches
        const mobileExists = await User.findOne({ mobileNo });
        if (mobileExists) {
            return res.status(400).json({ message: 'User already exists with this mobile number' });
        }

        // Check if username already exists
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            mobileNo,
            password,
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                username: user.username,
                email: user.email,
                mobileNo: user.mobileNo,
                token: generateToken(user._id),
                profilePicture: user.profilePicture,
                message: 'Account created successfully',
            });
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup. Please try again.' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body; // 'identifier' can be email or mobile

        // Validate required fields
        if (!identifier || !password) {
            return res.status(400).json({ message: 'Please provide email/mobile and password' });
        }

        // Find user by email, mobileNo, or username (case-insensitive)
        const usernameRegex = new RegExp('^' + identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { mobileNo: identifier },
                { username: { $regex: usernameRegex } }
            ]
        });

        // Check if user exists and password matches
        if (user) {
            const isMatch = await user.matchPassword(password);
            if (isMatch) {
                res.json({
                    _id: user.id,
                    username: user.username,
                    email: user.email,
                    mobileNo: user.mobileNo,
                    profilePicture: user.profilePicture,
                    token: generateToken(user._id),
                    message: 'Login successful',
                });
            } else {
                console.log(`[Auth] Login failed for ${identifier}: Password mismatch`);
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            console.log(`[Auth] Login failed: User not found for ${identifier}`);
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login. Please try again.' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            user.mobileNo = req.body.mobileNo || user.mobileNo;
            if (req.body.profilePicture) {
                user.profilePicture = req.body.profilePicture;
            }
            if (req.body.password) {
                if (!isPasswordStrong(req.body.password)) {
                    return res.status(400).json({ message: 'Password is too weak. It must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
                }
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                mobileNo: updatedUser.mobileNo,
                profilePicture: updatedUser.profilePicture,
                token: generateToken(updatedUser._id),
                message: 'Profile updated successfully',
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error during profile update' });
    }
};

// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { identifier } = req.body;

        const usernameRegex = new RegExp('^' + identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { mobileNo: identifier },
                { username: { $regex: usernameRegex } }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins expiry
        await user.save();

        // MOCK: Send OTP (Log to console)
        console.log(`[OTP] Reset OTP for ${user.username}: ${otp}`);

        res.json({ message: `OTP sent to your ${identifier.includes('@') ? 'email' : 'mobile'}` });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error during forgot password' });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
    try {
        const { identifier, otp } = req.body;

        const usernameRegex = new RegExp('^' + identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { mobileNo: identifier },
                { username: { $regex: usernameRegex } }
            ],
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.warn('Verify OTP error:', error);
        res.status(500).json({ message: 'Server error during OTP verification' });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { identifier, otp, newPassword } = req.body;

        const usernameRegex = new RegExp('^' + identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i');
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { mobileNo: identifier },
                { username: { $regex: usernameRegex } }
            ],
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired session' });
        }

        // Validate password strength
        if (!isPasswordStrong(newPassword)) {
            return res.status(400).json({ message: 'Password is too weak. It must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
        }

        // Update password (will be hashed by middleware)
        user.password = newPassword;
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password updated successfully. Please login with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

// @desc    Register FCM Token
// @route   POST /api/auth/register-fcm
// @access  Private
exports.registerFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ message: 'FCM token required' });
        }

        const result = await User.updateOne({ _id: req.user._id }, { fcmToken });
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'FCM token registered successfully', success: true });
    } catch (error) {
        console.error('FCM registration error:', error);
        res.status(500).json({ message: 'Server error during FCM registration' });
    }
};

// @desc    Login/Register with Google
// @route   POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: 'Google ID Token is required' });
        }

        let payload;
        try {
            // Verify ID Token
            const verifyOptions = {
                idToken,
            };
            if (process.env.GOOGLE_CLIENT_ID) {
                verifyOptions.audience = process.env.GOOGLE_CLIENT_ID;
            }
            const ticket = await googleClient.verifyIdToken(verifyOptions);
            payload = ticket.getPayload();
        } catch (verifyError) {
            console.error('Error verifying Google Token:', verifyError);
            return res.status(400).json({ message: 'Invalid Google Token' });
        }

        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            return res.status(400).json({ message: 'Email not provided by Google account' });
        }

        // Check if user exists by googleId first
        let user = await User.findOne({ googleId });

        if (!user) {
            // If not found by googleId, check by email
            user = await User.findOne({ email: email.toLowerCase() });

            if (user) {
                // User exists with this email (registered locally or previously), link Google ID
                user.googleId = googleId;
                if (!user.profilePicture && picture) {
                    user.profilePicture = picture;
                }
                user.loginType = 'google';
                await user.save();
            } else {
                // Create a new user
                // Generate a unique username from name or email
                let baseUsername = name ? name.replace(/\s+/g, '').toLowerCase() : email.split('@')[0];
                let username = baseUsername;
                let isUnique = false;
                let counter = 1;

                while (!isUnique) {
                    const existingUser = await User.findOne({ username });
                    if (!existingUser) {
                        isUnique = true;
                    } else {
                        username = `${baseUsername}${counter}`;
                        counter++;
                    }
                }

                user = await User.create({
                    username,
                    email: email.toLowerCase(),
                    googleId,
                    profilePicture: picture || '',
                    loginType: 'google',
                });
            }
        } else {
            // User exists with this googleId. If name or picture changed, optionally update it
            let needsUpdate = false;
            if (picture && user.profilePicture !== picture) {
                user.profilePicture = picture;
                needsUpdate = true;
            }
            if (needsUpdate) {
                await user.save();
            }
        }

        res.json({
            _id: user.id,
            username: user.username,
            email: user.email,
            mobileNo: user.mobileNo || '',
            profilePicture: user.profilePicture,
            token: generateToken(user._id),
            message: 'Google login successful',
        });

    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ message: 'Server error during Google login' });
    }
};

