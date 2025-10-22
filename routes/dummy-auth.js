import { Router } from 'express';
import bcrypt from 'bcryptjs';
import DummyUser from '../models/DummyUser.js';
import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';

const router = Router();

// Define arrays locally
const lawyerSpecializations = [
  'Criminal Lawyer', 'Civil Lawyer', 'Family Court', 'Corporate/Business Lawyer',
  'Constitutional Lawyer', 'Environmental Lawyer', 'Labour and Employment Lawyer',
  'Property/Real Estate Lawyer', 'Tax Lawyer', 'Medical/Healthcare Lawyer',
  'Cyber Lawyer', 'Education Lawyer', 'Human Rights Lawyer', 'Administrative Lawyer',
  'International Lawyer', 'Intellectual Property (IP) Lawyer', 'Other'
];

// Dummy account creation (no email verification)
router.post('/create-dummy-account', async (req, res) => {
  console.log("Received dummy account creation request:", req.body);
  try {
    const { name, email, password, role, location, specialization } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    if (!['client', 'lawyer', 'student', 'advisor'].includes(role)) {
      return res.status(400).json({ message: 'Invalid user role specified.' });
    }
    if (role === 'lawyer' && (!specialization || !lawyerSpecializations.includes(specialization))) {
      return res.status(400).json({ message: 'A valid specialization is required for lawyer role.' });
    }

    // Check both User and DummyUser collections
    const existingUser = await User.findOne({ email });
    const existingDummyUser = await DummyUser.findOne({ email });
    if (existingUser || existingDummyUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create dummy user
    const newDummyUser = new DummyUser({
      name,
      email,
      password: hashedPassword,
      role,
      specialization: role === 'lawyer' ? specialization : null,
      profile: {
        location: location || '',
        bio: `This is a demo ${role} account for testing purposes.`
      },
      phone: '000-000-0000' // Default dummy phone
    });

    await newDummyUser.save();
    console.log("Dummy account created successfully:", newDummyUser._id);

    // Generate token (same as regular users)
    const token = signToken(newDummyUser._id, newDummyUser.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newDummyUser._id,
        name: newDummyUser.name,
        email: newDummyUser.email,
        role: newDummyUser.role,
        specialization: newDummyUser.specialization,
        profile: newDummyUser.profile,
        isDummy: true
      },
      message: 'Demo account created successfully! You can now login.'
    });

  } catch (err) {
    console.error('Dummy Account Creation Error:', err);
    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({ message: `Validation failed: ${messages.join(', ')}` });
    }
    res.status(500).json({ message: 'Server error during demo account creation.' });
  }
});

export default router;