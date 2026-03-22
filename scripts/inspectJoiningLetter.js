require('dotenv').config();
const connectDB = require('../config/db');
const Member = require('../models/Member');
const { generateJoiningLetter } = require('../utils/joiningLetterGenerator');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    await connectDB();
    const member = await Member.findOne({ membershipId: 'RMAS-2026-001' });
    const url = await generateJoiningLetter(member);
    console.log('generated url', url);
    const pdfPath = path.join(__dirname, '..', url);
    console.log('pdf exists', fs.existsSync(pdfPath));
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log('pdf size', stats.size);
    }
  } catch (e) {
    console.error('error', e);
  }
})();
