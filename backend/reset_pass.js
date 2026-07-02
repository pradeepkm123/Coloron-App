const mongoose = require('mongoose');
const User = require('./src/modules/auth/user.model');
const config = require('./src/config/config');

async function resetPasswords() {
    try {
        await mongoose.connect(config.mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        const accounts = [
            { email: 'pradeepvijay170@gmail.com', mobile: '1234567890' },
            { email: 'prd123@gmail.com', mobile: '9876543210' }
        ];

        for (const acc of accounts) {
            const user = await User.findOne({ email: acc.email });
            if (user) {
                user.password = '123456';
                if (!user.mobileNo) user.mobileNo = acc.mobile;
                await user.save();
                console.log(`Password reset for ${acc.email} to 123456`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

resetPasswords();
