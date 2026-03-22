const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { 
    type: String,
    enum: ['Superadmin','President', 'Secretary', 'Media Incharge'],
    default: 'President'
  },
  level: { 
    type: String,
    enum: ['National', 'State', 'Division', 'District', 'Block', 'Panchayat'],
    default: 'National'
  },
  location: {
    state: { type: String },
    division: { type: String },
    district: { type: String },
    block: { type: String },
    panchayat: { type: String }
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  // OTP for password reset
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  otpLastRequestTime: { type: Date, default: null }
}, { timestamps: true });

UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  // Skip hashing if already hashed (e.g., when setPassword is used)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Set password (triggers hash)
UserSchema.methods.setPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(password, salt);
};

module.exports = mongoose.model('User', UserSchema);
