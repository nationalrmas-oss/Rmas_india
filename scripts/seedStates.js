const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');

// use a reliable public DNS to resolve SRV records if local DNS blocks them
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn('unable to set DNS servers', e);
}   

require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Model Import (Ensure path is correct)
const Location = require('../models/Location');

const states = [
    { name: 'Andaman and Nicobar Islands', type: 'State', stateCode: 'AN' },
    { name: 'Andhra Pradesh', type: 'State', stateCode: 'AP' },
    { name: 'Arunachal Pradesh', type: 'State', stateCode: 'AR' },
    { name: 'Assam', type: 'State', stateCode: 'AS' },
    { name: 'Bihar', type: 'State', stateCode: 'BR' },
    { name: 'Chandigarh', type: 'State', stateCode: 'CH' },
    { name: 'Chhattisgarh', type: 'State', stateCode: 'CG' },
    { name: 'Delhi', type: 'State', stateCode: 'DL' },
    { name: 'Goa', type: 'State', stateCode: 'GA' },
    { name: 'Gujarat', type: 'State', stateCode: 'GJ' },
    { name: 'Haryana', type: 'State', stateCode: 'HR' },
    { name: 'Himachal Pradesh', type: 'State', stateCode: 'HP' },
    { name: 'Jharkhand', type: 'State', stateCode: 'JH' },
    { name: 'Karnataka', type: 'State', stateCode: 'KA' },
    { name: 'Kerala', type: 'State', stateCode: 'KL' },
    { name: 'Madhya Pradesh', type: 'State', stateCode: 'MP' },
    { name: 'Maharashtra', type: 'State', stateCode: 'MH' },
    { name: 'Manipur', type: 'State', stateCode: 'MN' },
    { name: 'Meghalaya', type: 'State', stateCode: 'ML' },
    { name: 'Mizoram', type: 'State', stateCode: 'MZ' },
    { name: 'Nagaland', type: 'State', stateCode: 'NL' },
    { name: 'Odisha', type: 'State', stateCode: 'OR' },
    { name: 'Puducherry', type: 'State', stateCode: 'PY' },
    { name: 'Punjab', type: 'State', stateCode: 'PB' },
    { name: 'Rajasthan', type: 'State', stateCode: 'RJ' },
    { name: 'Sikkim', type: 'State', stateCode: 'SK' },
    { name: 'Tamil Nadu', type: 'State', stateCode: 'TN' },
    { name: 'Telangana', type: 'State', stateCode: 'TG' },
    { name: 'Tripura', type: 'State', stateCode: 'TR' },
    { name: 'Uttar Pradesh', type: 'State', stateCode: 'UP' },
    { name: 'Uttarakhand', type: 'State', stateCode: 'UK' },
    { name: 'West Bengal', type: 'State', stateCode: 'WB' }
];

const seedStates = async () => {
    try {
        console.log("⏳ Connecting to Atlas...");
        console.log('MONGODB_URI=', process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:[^:@]+@/, ':*****@') : '[not set]');
        await mongoose.connect(process.env.MONGODB_URI, {
            family: 4,
            serverSelectionTimeoutMS: 20000,
            socketTimeoutMS: 45000
        });
        console.log("🔗 Connected to Database");

        console.log("🗑️ Cleaning old data...");
        await Location.deleteMany({ type: 'State' });

        console.log("🌱 Inserting India States...");
        await Location.insertMany(states);

        console.log('------------------------------------');
        console.log('✅ SUCCESS: States Seeded Successfully!');
        console.log('------------------------------------');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR:', err);
        process.exit(1);
    }
};

seedStates();