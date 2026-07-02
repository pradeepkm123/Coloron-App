const mongoose = require('mongoose');
const User = require('./src/modules/auth/user.model');
const config = require('./src/config/config');

async function createTestUser() {
    try {
        await mongoose.connect(config.mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        const email = 'test@vms.com';
        const existing = await User.findOne({ email });
        if (existing) {
            await User.deleteOne({ email });
        }

        const user = await User.create({
            username: 'Tester',
            email: email,
            mobileNo: '0000000000',
            password: '123456'
        });
        
        console.log('Test user created successfully: test@vms.com / 123456');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

createTestUser();
