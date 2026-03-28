const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');
const fs = require('fs').promises;

// ensure SRV records can be looked up even on restrictive networks
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn('unable to set DNS servers', e);
}

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Member = require('../models/Member');

const deleteAll = async () => {
    try {
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);

        // Delete all members
        const result = await Member.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} members from database.`);

        // Disconnect from DB
        await mongoose.disconnect();

        // Delete uploaded files
        const uploadsDir = path.join(__dirname, '../public/uploads');
        try {
            const files = await fs.readdir(uploadsDir);
            for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                await fs.unlink(filePath);
                console.log(`🗑️ Deleted uploaded file: ${file}`);
            }
        } catch (err) {
            console.log('No uploaded files in public/uploads to delete or error:', err.message);
        }

        // Delete uploaded files in root uploads
        const rootUploadsDir = path.join(__dirname, '../uploads');
        try {
            const files = await fs.readdir(rootUploadsDir);
            for (const file of files) {
                const filePath = path.join(rootUploadsDir, file);
                await fs.unlink(filePath);
                console.log(`🗑️ Deleted uploaded file from root: ${file}`);
            }
        } catch (err) {
            console.log('No uploaded files in root uploads to delete or error:', err.message);
        }

        // Delete PDFs
        const pdfsDir = path.join(__dirname, '../public/pdfs');
        try {
            const files = await fs.readdir(pdfsDir);
            for (const file of files) {
                const filePath = path.join(pdfsDir, file);
                await fs.unlink(filePath);
                console.log(`🗑️ Deleted PDF: ${file}`);
            }
        } catch (err) {
            console.log('No PDFs to delete or error:', err.message);
        }

        console.log('✅ All membership applications, uploaded files, and PDFs have been deleted.');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR:', err);
        process.exit(1);
    }
};

deleteAll();