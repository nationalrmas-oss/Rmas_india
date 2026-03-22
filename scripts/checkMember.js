require('dotenv').config();
const connectDB = require('../config/db');
const Member = require('../models/Member');

(async () => {
  try {
    await connectDB();
    const member = await Member.findOne({ status: 'approved' }).lean();
    console.log('found', member ? member.membershipId : 'none');
    const count = await Member.countDocuments();
    console.log('count', count);
  } catch (err) {
    console.error('error', err);
    process.exit(1);
  }
})();
