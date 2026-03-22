const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  // Auto-generated Tracking ID
  trackingId: {
    type: String,
    unique: true,
    required: true
  },

  // Step 1: Complainant Information
  complainant: {
    fullName: {
      type: String,
      required: [true, 'Complainant full name is required'],
      trim: true
    },
    fatherName: {
      type: String,
      required: [true, 'Father/Husband name is required'],
      trim: true
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [1, 'Age must be at least 1'],
      max: [120, 'Age must be less than 120']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required']
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      match: [/^\d{10}$/, 'Mobile must be exactly 10 digits']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    address: {
      street: String,
      city: String,
      district: {
        type: String,
        required: [true, 'District is required']
      },
      state: {
        type: String,
        default: 'Delhi'
      },
      pincode: {
        type: String,
        match: [/^\d{6}$/, 'Pincode must be exactly 6 digits']
      }
    },
    occupation: String,
    relationToVictim: {
      type: String,
      enum: ['self', 'family', 'friend', 'lawyer', 'other'],
      default: 'self'
    }
  },

  // Step 2: Victim Information
  victim: {
    fullName: {
      type: String,
      required: [true, 'Victim full name is required'],
      trim: true
    },
    fatherName: {
      type: String,
      trim: true
    },
    age: {
      type: Number,
      min: [1, 'Age must be at least 1'],
      max: [120, 'Age must be less than 120']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    caste: String,
    religion: String,
    occupation: String,
    address: {
      street: String,
      city: String,
      district: String,
      state: String,
      pincode: String
    },
    contactNumber: String,
    sameAsComplainant: {
      type: Boolean,
      default: false
    }
  },

  // Step 3: Incident Details
  incident: {
    category: {
      type: String,
      required: [true, 'Complaint category is required'],
      enum: [
        'police-atrocity',
        'women-rights',
        'minority-rights',
        'child-rights',
        'human-trafficking',
        'torture',
        'illegal-detention',
        'corruption',
        'land-rights',
        'environmental-rights',
        'labor-rights',
        'other'
      ]
    },
    subCategory: String,
    incidentDate: {
      type: Date,
      required: [true, 'Incident date is required']
    },
    incidentTime: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number], // [longitude, latitude]
      address: {
        street: String,
        city: String,
        district: {
          type: String,
          required: [true, 'Incident district is required']
        },
        state: {
          type: String,
          default: 'Delhi'
        },
        pincode: String
      }
    },
    policeStation: String,
    firNumber: String,
    description: {
      type: String,
      required: [true, 'Incident description is required'],
      minlength: [50, 'Description must be at least 50 characters'],
      maxlength: [2000, 'Description must be less than 2000 characters']
    },
    witnesses: [{
      name: String,
      contact: String,
      address: String
    }],
    accusedPersons: [{
      name: String,
      designation: String,
      department: String,
      contact: String
    }],
    previousComplaints: {
      filed: {
        type: Boolean,
        default: false
      },
      details: String
    },
    compensationClaimed: {
      type: Number,
      min: 0
    }
  },

  // Step 4: Documents
  documents: {
    idProof: {
      type: String, // File path or URL
      filename: String,
      originalName: String
    },
    addressProof: {
      type: String,
      filename: String,
      originalName: String
    },
    medicalReports: [{
      type: String,
      filename: String,
      originalName: String
    }],
    policeReports: [{
      type: String,
      filename: String,
      originalName: String
    }],
    otherDocuments: [{
      type: String,
      filename: String,
      originalName: String,
      description: String
    }]
  },

  // Status and Tracking
  status: {
    type: String,
    enum: ['pending', 'under-review', 'investigating', 'resolved', 'rejected'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    nationalPresident: {
      type: Boolean,
      default: true
    },
    districtPresident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    investigators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },

  // Language and Metadata
  language: {
    type: String,
    enum: ['en', 'hi', 'ur'],
    default: 'en'
  },
  ipAddress: String,
  userAgent: String,

  // Timestamps
  submittedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,

  // Audit Trail
  updates: [{
    status: String,
    comment: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance

complaintSchema.index({ 'complainant.mobile': 1 });
complaintSchema.index({ 'complainant.email': 1 });
complaintSchema.index({ 'incident.category': 1 });
complaintSchema.index({ 'incident.district': 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ submittedAt: -1 });

// Pre-save middleware to generate tracking ID
complaintSchema.pre('save', async function(next) {
  if (this.isNew) {
    const currentYear = new Date().getFullYear();
    const count = await mongoose.model('Complaint').countDocuments({
      trackingId: new RegExp(`^RMAS/COMP/${currentYear}/`)
    });
    const sequenceNumber = (count + 1).toString().padStart(3, '0');
    this.trackingId = `RMAS/COMP/${currentYear}/${sequenceNumber}`;
  }
  next();
});

// Virtual for formatted tracking ID
complaintSchema.virtual('formattedTrackingId').get(function() {
  return this.trackingId;
});

// Method to get complaint summary
complaintSchema.methods.getSummary = function() {
  return {
    trackingId: this.trackingId,
    complainant: this.complainant.fullName,
    victim: this.victim.fullName,
    category: this.incident.category,
    district: this.incident.location.address.district,
    status: this.status,
    submittedAt: this.submittedAt
  };
};

// Static method to generate tracking ID
complaintSchema.statics.generateTrackingId = async function(year) {
  // Format: RMAS/COMP/YYYY/XXXX (where XXXX is sequential number)
  const prefix = `RMAS/COMP/${year}/`;
  
  // Find the highest sequential number for this year
  const lastComplaint = await this.findOne(
    { trackingId: new RegExp(`^${prefix}`) },
    { trackingId: 1 },
    { sort: { trackingId: -1 } }
  );
  
  let nextNumber = 1;
  if (lastComplaint && lastComplaint.trackingId) {
    const lastNumber = parseInt(lastComplaint.trackingId.split('/').pop());
    nextNumber = lastNumber + 1;
  }
  
  // Pad with zeros to make it 4 digits
  const paddedNumber = nextNumber.toString().padStart(4, '0');
  return `${prefix}${paddedNumber}`;
};

module.exports = mongoose.model('Complaint', complaintSchema);