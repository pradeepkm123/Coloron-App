const mongoose = require('mongoose');
const User = require('./src/modules/auth/user.model');
const config = require('./src/config/config');

async function checkUser() {
    try {
        await mongoose.connect(config.mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        const user = await User.findOne({ email: 'pradeepvijay170@gmail.com' });
        if (user) {
            console.log('User found:', user.email);
            console.log('Hashed Password:', user.password);
            const isMatch = await user.matchPassword('123456');
            console.log('Match with 123456:', isMatch);
        } else {
            console.log('User not found');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUser();
