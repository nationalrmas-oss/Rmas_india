const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    // Personal Information
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, 'Father/Husband name is required'],
      trim: true,
    },
    dob: {
      type: String,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      match: [/^\d{10}$/, 'Mobile must be exactly 10 digits'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
      default: null,
    },
    education: {
      type: String,
      default: null,
    },
    occupation: {
      type: String,
      default: null,
    },
    idNumber: {
      type: String,
      default: null,
    },

    // Location Details
    state: {
      type: String,
      required: [true, 'State is required'],
    },
    division: {
      type: String,
      required: [true, 'Division is required'],
    },
    district: {
      type: String,
      required: [true, 'District is required'],
    },
    block: {
      type: String,
      required: [true, 'Block is required'],
    },
    houseNo: {
      type: String,
      default: null,
    },
    street: {
      type: String,
      default: null,
    },
    panchayat: {
      type: String,
      default: null,
    },
    village: {
      type: String,
      default: null,
    },
    pincode: {
      type: String,
      default: null,
    },

    // Documentation
    reason: {
      type: String,
      required: [true, 'Reason to join is required'],
    },
    photo: {
      type: String, // stores filename/path
      required: [true, 'Photo is required'],
    },
    documents: {
      type: String, // stores filename/path
      required: [true, 'Documents are required'],
    },
    agreedToTerms: {
      type: Boolean,
      required: [true, 'You must agree to the terms'],
    },

    // Membership ID generated upon final approval
    membershipId: { 
      type: String, 
      unique: true, 
      sparse: true 
    },
    // Approval workflow
    status: {
      type: String,
      enum: ['pending','verified','forwarded','approved','rejected'],
      default: 'pending'
    },
    rejectionReason: {
      type: String,
      default: null
    },
    isIDCardApproved: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewHistory: [{
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      action: String,
      comment: String,
      date: { type: Date, default: Date.now }
    }],

    // Position Assignment (Role Assignment)
    assignedPosition: {
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
        'Karyakarini Sadasya',
        null
      ],
      default: null
    },
    teamType: {
      type: String,
      enum: ['Core', 'Mahila', 'Yuva', 'Alpsankhyak', 'SC/ST', null],
      default: null
    },
    positionLevel: {
      type: String,
      enum: ['National', 'State', 'Division', 'District', 'Block', 'Panchayat', 'Member', null],
      default: null
    },
    positionLocation: {
      state: { type: String, default: null },
      division: { type: String, default: null },
      district: { type: String, default: null },
      block: { type: String, default: null },
      panchayat: { type: String, default: null }
    },
    positionAssignedAt: { type: Date, default: null },
    positionAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
  },
  {
    timestamps: true,
  }
);



// Helper: Generate new membershipId
memberSchema.statics.generateMembershipId = async function(state) {
  // State code logic
  let stateCode = 'IN';
  if (state) {
    const s = state.trim().toLowerCase();
    if (s === 'bihar') stateCode = 'BR';
    else if (s === 'uttar pradesh') stateCode = 'UP';
    // Add more state codes as needed
  }
  const year = new Date().getFullYear().toString().slice(-2); // e.g., '26'
  // Find last serial for this state/year
  const last = await this.find({
    membershipId: { $regex: `^RMAS/${stateCode}/${year}/` }
  }).sort({ membershipId: -1 }).limit(1);
  let serial = 1;
  if (last.length > 0) {
    const parts = last[0].membershipId.split('/');
    if (parts.length === 4) {
      const lastSerial = parseInt(parts[3], 10);
      if (!isNaN(lastSerial)) serial = lastSerial + 1;
    }
  }
  const serialStr = String(serial).padStart(4, '0');
  return `RMAS/${stateCode}/${year}/${serialStr}`;
};

module.exports = mongoose.model('Member', memberSchema);
