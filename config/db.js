const mongoose = require('mongoose');
const dns = require('dns');

// in case OS DNS refuses SRV queries, switch to Google's public servers
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn('could not override DNS servers', e);
}

const connectDB = async () => {
    try {
        console.log("⏳ Connecting to MongoDB Atlas...");
        
        // connect using URL from .env; SRV will now resolve via public DNS
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log('✅ MongoDB Connected to Atlas Successfully!');
        
        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // FORCE: rebuild/drop the troublesome membershipId index and sync the schema
        // the previous code used membersColl.getIndexes(), which doesn't exist on the
        // native collection object; use .indexes() instead and also explicitly drop
        // membershipId_1 before syncing in case it's non‑sparse.
        console.log('🔧 Ensuring membershipId_1 is sparse (drop + sync)...');
        try {
            const db = mongoose.connection.db;
            const membersColl = db.collection('members');

            // drop the old index if it exists (ignore errors)
            await membersColl.dropIndex('membershipId_1').catch(() => {});

            // list remaining indexes for debugging
            const indexes = await membersColl.indexes();
            console.log('📋 Current indexes after drop attempt:', indexes.map(i => i.name));

            // Now sync mongoose schema which will recreate sparse index
            const Member = mongoose.model('Member');
            await Member.syncIndexes();
            console.log('✅ Schema indexes synced');

            // verify the newly created index is sparse
            const newIndexes = await membersColl.indexes();
            console.log('📋 New indexes:', newIndexes.map(i => `${i.name}${i.sparse ? ' (sparse)' : ''}`));
            const membershipIdIndex = newIndexes.find(i => i.name === 'membershipId_1');
            if (membershipIdIndex && membershipIdIndex.sparse === true) {
                console.log('✅✅✅ SUCCESS: membershipId_1 dropped and recreated successfully');
            } else {
                console.log('⚠️  WARNING: membershipId_1 sparse status:', membershipIdIndex?.sparse);
            }
        } catch (err) {
            console.error('⚠️  Index rebuild error:', err.message);
        }
        
    } catch (err) {
        console.error('❌ Database Connection Error:', err.message);
        // not exiting so the server can still start for debug
    }
};

module.exports = connectDB;