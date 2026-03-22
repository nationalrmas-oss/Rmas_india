const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['State', 'Division', 'District', 'Block'], 
        required: true 
    },
    parent: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Location', 
        default: null 
    },
    stateCode: String // For quick filtering (e.g., 'BR', 'UP', 'MH')
});

module.exports = mongoose.model('Location', LocationSchema);