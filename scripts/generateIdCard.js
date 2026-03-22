require('dotenv').config();
const connectDB = require('../config/db');
const Member = require('../models/Member');

(async () => {
  try {
    await connectDB();
    const member = await Member.findOne({ membershipId: 'RMAS-2026-001' });
    console.log('member', member ? member.fullName : 'none');
    const { generateIdCard } = require('../utils/idCardGenerator');
    console.log('calling generateIdCard');
    const pdfUrl = await generateIdCard(member);
    console.log('pdfUrl', pdfUrl);
  } catch (err) {
    console.error('generate failed', err);
    console.error('generate failed stack', err.stack);
    process.exit(1);
  }
})();
