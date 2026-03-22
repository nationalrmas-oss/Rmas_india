const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');

// ensure SRV records can be looked up even on restrictive networks
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn('unable to set DNS servers', e);
}  

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

const seedAdmin = async () => {
    try {
        console.log("⏳ Connecting for Admin Seed...");
        await mongoose.connect(process.env.MONGODB_URI);

        // Delete existing admin to avoid duplicates
        await User.deleteOne({ username: 'admin' });

        const superAdmin = new User({
            fullName: 'Md Jawed Akhter',
            username: 'admin',
            email: 'nationalrmas@gmail.com',
            password: 'Admin@123', // Will be hashed by pre-save hook
            phone: '7249779703',
            role: 'Superadmin',
            level: 'National',
            location: {
                state: 'Bihar',
                division: 'Patna',
                district: 'Katihar',
                block: 'Katihar'
            },
            isVerified: true,
            isActive: true
        });

        await superAdmin.save();
        
        console.log('------------------------------------');
        console.log('✅ SUCCESS: Superadmin Created!');
        console.log('Credentials: Username = admin | Password = Admin@123');
        console.log('Login at: http://localhost:3000/admin/login');
        console.log('------------------------------------');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR:', err);
        process.exit(1);
    }
};

seedAdmin();