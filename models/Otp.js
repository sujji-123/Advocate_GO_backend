// Backend/models/Otp.js

import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    identifier: { type: String, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    
    // --- MODIFICATION START ---
    // Added the 'role' field to know what user type is verifying
    role: { 
      type: String, 
      enum: ['client', 'lawyer', 'student', 'advisor'],
      required: true 
    },
    // Optional specialization saved at OTP time (for lawyers)
    specialization: { type: String },
    // --- MODIFICATION END ---

    consumed: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
}, { timestamps: true });

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;
