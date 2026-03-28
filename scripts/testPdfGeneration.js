const fs = require('fs');
const path = require('path');
const { generateIdCard } = require('../utils/idCardGenerator');
const { generateJoiningLetter } = require('../utils/joiningLetterGenerator');

async function runTest() {
  const testMember = {
    membershipId: 'RMAS/TEST/0001',
    fullName: 'रमेश कुमार',
    fatherName: 'शिव प्रसाद',
    dob: '1985-08-15',
    gender: 'male',
    mobile: '9922334455',
    email: 'ramesh.test@example.com',
    bloodGroup: 'O+',
    state: 'Bihar',
    district: 'Patna',
    block: 'Patna Sadar',
    village: 'Rajendra Nagar',
    houseNo: '123',
    pincode: '800001',
    role: 'district_coordinator',
    status: 'approved',
    isIDCardApproved: true,
    assignedRoles: [{ level: 'district', role: 'District Coordinator', location: 'Patna' }]
  };

  console.log('✅ Running PDF generation test for test member...');

  const idCardUrl = await generateIdCard(testMember);
  const joiningLetterUrl = await generateJoiningLetter(testMember);

  const idCardPath = path.join(__dirname, '..', 'public', idCardUrl);
  const joiningLetterPath = path.join(__dirname, '..', 'public', joiningLetterUrl);

  console.log('ID card URL:', idCardUrl);
  console.log('Joining letter URL:', joiningLetterUrl);
  console.log('ID card exists:', fs.existsSync(idCardPath));
  console.log('Joining letter exists:', fs.existsSync(joiningLetterPath));
  console.log('ID card size bytes:', fs.existsSync(idCardPath) ? fs.statSync(idCardPath).size : 0);
  console.log('Joining letter size bytes:', fs.existsSync(joiningLetterPath) ? fs.statSync(joiningLetterPath).size : 0);

  if (fs.existsSync(idCardPath) && fs.existsSync(joiningLetterPath)) {
    console.log('✅ PDF generation test passed: both files generated and present.');
  } else {
    throw new Error('PDF generation test failed: missing file(s).');
  }
}

runTest().catch(err => {
  console.error('❌ testPdfGeneration failed:', err);
  process.exit(1);
});
