const mongoose = require('mongoose');
const User = require('./src/modules/auth/user.model');
const config = require('./src/config/config');

async function resetLookman() {
    try {
        await mongoose.connect(config.mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        const user = await User.findOne({ mobileNo: '9123520096' });
        if (user) {
            user.password = '123456';
            await user.save();
            console.log('Password reset for Lookman (9123520096) to 123456');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

resetLookman();
