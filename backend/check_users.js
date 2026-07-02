const mongoose = require('mongoose');
const User = require('./src/modules/auth/user.model');
const config = require('./src/config/config');

async function checkUsers() {
    try {
        await mongoose.connect(config.mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        const users = await User.find({}, 'username email mobileNo');
        console.log('--- Current Users ---');
        console.log(JSON.stringify(users, null, 2));
        console.log('---------------------');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUsers();
