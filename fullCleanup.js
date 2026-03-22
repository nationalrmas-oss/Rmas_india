/*
  FULL DATABASE CLEANUP SCRIPT
  
  This script performs a complete cleanup:
  1. Deletes ALL member applications
  2. Deletes ALL users except super-admin
  3. Drops the membershipId_1 index
  4. Recreates a fresh sparse unique index
  
  Usage: node fullCleanup.js
*/

const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    console.log('\n🔧 FULL DATABASE CLEANUP INITIATED...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rmas-national');
    console.log('✅ Connected to MongoDB\n');

    const Member = require('./models/Member');
    const User = require('./models/User');

    // ============ 1. DELETE ALL MEMBERS ============
    console.log('📋 Step 1: Deleting all member applications...');
    const memberResult = await Member.deleteMany({});
    const totalMembersDeleted = memberResult.deletedCount;
    console.log(`✅ Deleted ${totalMembersDeleted} member(s)\n`);

    // ============ 2. DELETE ALL USERS EXCEPT SUPER-ADMIN ============
    console.log('📋 Step 2: Deleting all users except Superadmin...');
    const userResult = await User.deleteMany({ role: { $ne: 'Superadmin' } });
    const totalUsersDeleted = userResult.deletedCount;
    console.log(`✅ Deleted ${totalUsersDeleted} user(s)\n`);

    // ============ 3. DROP OLD INDEX ============
    console.log('📋 Step 3: Dropping old membershipId_1 index...');
    const db = mongoose.connection.db;
    const membersColl = db.collection('members');
    
    try {
      await membersColl.dropIndex('membershipId_1');
      console.log('✅ Dropped membershipId_1 index\n');
    } catch (err) {
      console.log('ℹ️  Index not found (already dropped or doesn\'t exist)\n');
    }

    // ============ 4. RECREATE SPARSE INDEX ============
    console.log('📋 Step 4: Recreating sparse unique index...');
    try {
      // Use Member.syncIndexes() to recreate from schema
      await Member.syncIndexes();
      console.log('✅ Synced schema indexes\n');

      // Verify the index was created correctly
      const indexes = await membersColl.indexes();
      const membershipIdIndex = indexes.find(i => i.name === 'membershipId_1');
      
      let indexStatus = 'FAIL';
      if (membershipIdIndex) {
        if (membershipIdIndex.partialFilterExpression) {
          console.log('✅ Partial filter expression:', membershipIdIndex.partialFilterExpression);
          indexStatus = 'SUCCESS - Partial Unique Index';
        } else if (membershipIdIndex.sparse === true) {
          console.log('✅ Sparse flag:', membershipIdIndex.sparse);
          indexStatus = 'SUCCESS - Sparse Index';
        }
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log('📊 FULL CLEANUP REPORT');
      console.log('='.repeat(60));
      console.log(`Total Members Deleted: ${totalMembersDeleted}`);
      console.log(`Total Users Deleted: ${totalUsersDeleted}`);
      console.log(`Index Status: ${indexStatus}`);
      console.log('='.repeat(60));
      console.log('\n✨ Database cleanup completed successfully!\n');

    } catch (indexErr) {
      console.error('❌ Index recreation error:', indexErr.message);
      console.log(`\nIndex Status: FAIL - ${indexErr.message}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ CLEANUP ERROR:', err.message);
    process.exit(1);
  }
})();
