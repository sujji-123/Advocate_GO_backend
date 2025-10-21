// Backend/models/User.js

import mongoose from "mongoose";

// --- NEW ---
// Define the list of lawyer specializations based on your screenshot
const lawyerSpecializations = [
  'Criminal Lawyer', 'Civil Lawyer', 'Family Court', 'Corporate/Business Lawyer',
  'Constitutional Lawyer', 'Environmental Lawyer', 'Labour and Employment Lawyer',
  'Property/Real Estate Lawyer', 'Tax Lawyer', 'Medical/Healthcare Lawyer',
  'Cyber Lawyer', 'Education Lawyer', 'Human Rights Lawyer', 'Administrative Lawyer',
  'International Lawyer', 'Intellectual Property (IP) Lawyer', 'Other'
];
// --- END NEW ---

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ['client', 'lawyer', 'student', 'advisor'],
    required: true,
  },
  
  // --- MODIFICATION START ---
  // Add specialization, only required if the role is 'lawyer'
  specialization: {
    type: String,
    enum: lawyerSpecializations,
    // This 'required' check runs only if the role is 'lawyer'
    required: function() { return this.role === 'lawyer'; },
  },

  // We will manage connections in a separate collection,
  // but we can add profile details here.
  profile: {
    bio: { type: String, default: '' },
    location: { type: String, default: '' },
    // more fields like education for students, etc. can be added here
  },
  // --- MODIFICATION END ---

  phone: { type: String, unique: true, sparse: true },
  passwordResetToken: String,
  passwordResetExpires: Date,

}, { timestamps: true });


const User = mongoose.model("User", userSchema);
export default User;