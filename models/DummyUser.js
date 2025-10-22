import mongoose from "mongoose";

// Define the arrays locally
const lawyerSpecializations = [
  'Criminal Lawyer', 'Civil Lawyer', 'Family Court', 'Corporate/Business Lawyer',
  'Constitutional Lawyer', 'Environmental Lawyer', 'Labour and Employment Lawyer',
  'Property/Real Estate Lawyer', 'Tax Lawyer', 'Medical/Healthcare Lawyer',
  'Cyber Lawyer', 'Education Lawyer', 'Human Rights Lawyer', 'Administrative Lawyer',
  'International Lawyer', 'Intellectual Property (IP) Lawyer', 'Other'
];

const dummyUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ['client', 'lawyer', 'student', 'advisor'],
    required: true,
  },
  specialization: {
    type: String,
    enum: lawyerSpecializations,
    required: function() { return this.role === 'lawyer'; },
  },
  profile: {
    bio: { type: String, default: '' },
    location: { type: String, default: '' },
  },
  phone: { type: String, default: '' },
  isDummy: { type: Boolean, default: true }, // Flag to identify dummy accounts
}, { timestamps: true });

const DummyUser = mongoose.model("DummyUser", dummyUserSchema);
export default DummyUser;