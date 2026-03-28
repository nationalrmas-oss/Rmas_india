const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');

try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn('unable to set DNS servers', e);
}

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Member = require('../models/Member');
const { generateMembershipKit } = require('../utils/membershipKitGenerator');

const testGenerate = async () => {
    try {
        console.log("⏳ Connecting...");
        await mongoose.connect(process.env.MONGODB_URI);

        const member = await Member.findOne({ membershipId: 'RMAS_TEST_001' });
        if (!member) {
            console.log('Member not found');
            return;
        }

        console.log('Generating for:', member.fullName);
        const result = await generateMembershipKit(member);
        console.log('Success:', result);

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ ERROR:', err);
        console.error('Stack:', err.stack);
    }
};

testGenerate();