const mongoose = require('mongoose');
const Member = require('./models/Member');

async function checkSampleData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rmas-national');
        const sample = await Member.findOne({});
        console.log('SAMPLE MEMBER DATA:', JSON.stringify(sample, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSampleData();