import mongoose from "mongoose";

const lawyerSpecializations = [
  'Criminal Lawyer', 'Civil Lawyer', 'Family Court', 'Corporate/Business Lawyer',
  'Constitutional Lawyer', 'Environmental Lawyer', 'Labour and Employment Lawyer',
  'Property/Real Estate Lawyer', 'Tax Lawyer', 'Medical/Healthcare Lawyer',
  'Cyber Lawyer', 'Education Lawyer', 'Human Rights Lawyer', 'Administrative Lawyer',
  'International Lawyer', 'Intellectual Property (IP) Lawyer', 'Other'
];

const validRoles = ['client', 'lawyer', 'student', 'advisor'];


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: validRoles,
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
 

  phone: { type: String, unique: true, sparse: true },
  passwordResetToken: String,
  passwordResetExpires: Date,

}, { timestamps: true });


const User = mongoose.model("User", userSchema);


export { lawyerSpecializations, validRoles };
export default User;