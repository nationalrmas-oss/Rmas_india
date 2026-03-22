const mongoose = require('mongoose');

const AdhyakshSchema = new mongoose.Schema(
  {
    // Reference to Member
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      unique: true
    },
    // Personal Details (cached from Member)
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    photo: { type: String, default: null },
    
    // Position Details
    position: {
      type: String,
      enum: [
        'Adhyaksh',
        'Varishth Upadhyaksh',
        'Upadhyaksh',
        'Mahasachiv',
        'Sachiv',
        'Zila Sangathan Sachiv',
        'Sanyukt Sachiv',
        'Vidhi Sachiv',
        'Koshadhyaksh',
        'Media Prabhari',
        'Media Sachiv',
        'Prachar Sachiv',
        'Press Sachiv',
        'Pravakta',
        'Karyakram Sachiv',
        'Karyakarini Sadasya'
      ],
      required: true
    },
    teamType: {
      type: String,
      enum: ['Core', 'Mahila', 'Yuva', 'Alpsankhyak', 'SC/ST'],
      required: true
    },
    level: {
      type: String,
      enum: ['National', 'State', 'Division', 'District', 'Block', 'Panchayat'],
      required: true
    },
    
    // Location Details
    state: { type: String, required: true },
    division: { type: String, default: null },
    district: { type: String, default: null },
    block: { type: String, default: null },
    panchayat: { type: String, default: null },
    
    // Assignment Details
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Adhyaksh', AdhyakshSchema);
