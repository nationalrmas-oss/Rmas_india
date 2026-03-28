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
const Member = require('../models/Member');

const seedTestMember = async () => {
    try {
        console.log("⏳ Connecting for Test Member Seed...");
        await mongoose.connect(process.env.MONGODB_URI);

        // Create a test member
        const testMember = new Member({
            fullName: 'Test Member',
            fatherName: 'Test Father',
            dob: '1990-01-01',
            gender: 'male',
            mobile: '1234567890',
            email: 'test@example.com',
            state: 'Bihar',
            district: 'Patna',
            division: 'Patna',
            block: 'Test Block',
            village: 'Test Village',
            qualification: 'Graduate',
            occupation: 'Farmer',
            reason: 'Test reason',
            membershipId: 'RMAS_TEST_001',
            status: 'approved',
            isIDCardApproved: true,
            photo: 'test.jpg', // Dummy photo
            documents: 'test.pdf', // Dummy documents
            agreedToTerms: true,
            applicationDate: new Date()
        });

        await testMember.save();

        console.log('✅ Test member created with ID:', testMember.membershipId);
        console.log('You can now test membership kit generation at: http://localhost:3000/membership-kit/RMAS_TEST_001');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR:', err);
        process.exit(1);
    }
};

seedTestMember();