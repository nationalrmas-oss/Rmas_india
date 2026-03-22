require('dotenv').config();
const connectDB = require('../config/db');
const Member = require('../models/Member');

(async () => {
  try {
    await connectDB();
    const member = await Member.findOne({ membershipId: 'RMAS-2026-001' });
    console.log('member', member ? member.fullName : 'none');
    const { generateJoiningLetter } = require('../utils/joiningLetterGenerator');
    const url = await generateJoiningLetter(member);
    console.log('joining letter url:', url);
  } catch (err) {
    console.error('ERROR', err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
