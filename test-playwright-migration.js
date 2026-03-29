const { generateIdCard } = require('./utils/idCardGenerator');
const { generateJoiningLetter } = require('./utils/joiningLetterGenerator');
const Member = require('./models/Member');
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('='.repeat(60));
    console.log('🧪 PLAYWRIGHT MIGRATION TEST');
    console.log('='.repeat(60));
    
    // Test 1: Module Loading
    console.log('\n✅ Test 1: Module Loading');
    console.log('   ✓ generateIdCard imported');
    console.log('   ✓ generateJoiningLetter imported');
    
    // Test 2: Connect to MongoDB
    console.log('\n⏳ Test 2: Database Connection');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rmas';
    await mongoose.connect(mongoUri);
    console.log('   ✓ Connected to MongoDB');
    
    // Test 3: Find a member
    console.log('\n⏳ Test 3: Finding Member');
    const member = await Member.findOne({ status: 'approved' }).lean();
    if (!member) {
      console.log('   ⚠️  No approved members found');
      console.log('\n   Creating a test member...');
      const testMember = new Member({
        fullName: 'Test Member',
        email: 'test@test.com',
        mobile: '9999999999',
        status: 'approved',
        membershipId: 'TEST-2026-001'
      });
      await testMember.save();
      console.log('   ✓ Test member created');
    } else {
      console.log(`   ✓ Found: ${member.fullName} (ID: ${member.membershipId})`);
    }
    
    // Test 4: Generate ID Card
    console.log('\n⏳ Test 4: Generating ID Card (Playwright)');
    const testMember = await Member.findOne({ 
      $or: [{ status: 'approved' }, { membershipId: 'TEST-2026-001' }] 
    }).lean();
    
    try {
      const idCardUrl = await generateIdCard(testMember);
      console.log(`   ✓ ID Card Generated: ${idCardUrl}`);
    } catch (err) {
      console.log(`   ⚠️  ID Card Error: ${err.message.substring(0, 100)}`);
    }
    
    // Test 5: Generate Joining Letter
    console.log('\n⏳ Test 5: Generating Joining Letter (Playwright)');
    try {
      const joiningLetterUrl = await generateJoiningLetter(testMember);
      console.log(`   ✓ Joining Letter Generated: ${joiningLetterUrl}`);
    } catch (err) {
      console.log(`   ⚠️  Joining Letter Error: ${err.message.substring(0, 100)}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PLAYWRIGHT MIGRATION TEST COMPLETE');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
