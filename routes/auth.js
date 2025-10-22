import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import DummyUser from '../models/DummyUser.js';
import Otp from '../models/Otp.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../utils/mailer.js';
import auth from '../middleware/auth.js';
import { signToken } from '../utils/jwt.js';

const router = Router();

// Define arrays locally since they're not exported from User.js
const lawyerSpecializations = [
  'Criminal Lawyer', 'Civil Lawyer', 'Family Court', 'Corporate/Business Lawyer',
  'Constitutional Lawyer', 'Environmental Lawyer', 'Labour and Employment Lawyer',
  'Property/Real Estate Lawyer', 'Tax Lawyer', 'Medical/Healthcare Lawyer',
  'Cyber Lawyer', 'Education Lawyer', 'Human Rights Lawyer', 'Administrative Lawyer',
  'International Lawyer', 'Intellectual Property (IP) Lawyer', 'Other'
];

const validRoles = ['client', 'lawyer', 'student', 'advisor'];

// Helper: generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// SIGNUP FLOW (OTP Based)
router.post('/signup-request-otp', async (req, res) => {
  try {
    const { email, role, specialization } = req.body;
    if (!email || !role) {
      return res.status(400).json({ message: 'Email and Role are required.' });
    }
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid user role.' });
    }
    if (role === 'lawyer' && (!specialization || !lawyerSpecializations.includes(specialization))) {
      return res.status(400).json({ message: 'Valid specialization is required for lawyers.' });
    }

    // Check both User and DummyUser collections
    const existingUser = await User.findOne({ email });
    const existingDummyUser = await DummyUser.findOne({ email });
    if (existingUser || existingDummyUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const OTP_CODE = generateOtp();
    const codeHash = await bcrypt.hash(OTP_CODE, 10);
    const OTP_LIFETIME_MIN = 10;

    await Otp.deleteMany({ identifier: email });

    await Otp.create({
      identifier: email,
      codeHash,
      role: role,
      specialization: role === 'lawyer' ? specialization : undefined,
      expiresAt: new Date(Date.now() + OTP_LIFETIME_MIN * 60 * 1000),
    });

    await sendOtpEmail(email, OTP_CODE);
    res.json({ success: true, message: 'An OTP has been sent to your email for verification.' });
  } catch (err) {
    console.error('Signup OTP Error:', err);
    res.status(500).json({ message: 'Server error while sending OTP.' });
  }
});

router.post('/signup-complete', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    if (!name || !email || !password || !otp) {
      return res.status(400).json({ message: 'Name, email, password, and OTP are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const doc = await Otp.findOne({ identifier: email, consumed: false }).sort({ createdAt: -1 });
    if (!doc) return res.status(400).json({ message: 'No pending verification found or OTP already used.' });
    if (doc.expiresAt < new Date()) return res.status(400).json({ message: 'OTP has expired.' });

    const isMatch = await bcrypt.compare(otp, doc.codeHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP provided.' });
    }

    doc.consumed = true;
    await doc.save();

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: doc.role,
      specialization: doc.specialization
    });

    await newUser.save();

    const token = signToken(newUser._id, newUser.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        specialization: newUser.specialization
      },
      message: 'Account created successfully!',
    });
  } catch (err) {
    console.error('Signup Completion Error:', err);
    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({ message: `Validation failed: ${messages.join(', ')}` });
    }
    res.status(500).json({ message: 'Server error during account creation.' });
  }
});

// LOGIN & PASSWORD RESET FLOW
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password.' });
    }

    console.log("Login attempt for email:", email); // Debug log

    // Check both User and DummyUser collections
    let user = await User.findOne({ email }).select('+password');
    let userType = 'regular';
    
    if (!user) {
      // Check DummyUser collection if not found in User collection
      user = await DummyUser.findOne({ email }).select('+password');
      userType = 'dummy';
    }

    console.log("User found:", user ? "Yes" : "No"); // Debug log
    console.log("User type:", userType); // Debug log

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'Invalid login method for this account (no password set).' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch); // Debug log

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = signToken(user._id, user.role);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Return user data with type information
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      specialization: user.specialization,
      profile: user.profile
    };

    // Add isDummy flag for dummy users
    if (userType === 'dummy') {
      userResponse.isDummy = true;
    }

    console.log("Login successful for user:", userResponse.email); // Debug log
    res.json({
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    // Check both collections
    let user = await User.findOne({ email });
    if (!user) {
      user = await DummyUser.findOne({ email });
    }

    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    try {
      await sendPasswordResetEmail(user.email, resetToken);
      res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (mailError) {
      console.error('Forgot Password - Mail Sending Error:', mailError);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
    }

  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ message: 'An internal error occurred.' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    
    // Check both collections
    let user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      user = await DummyUser.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });
    }

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password is required and must be at least 6 characters long.' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully. Please log in.' });

  } catch (err) {
    console.error('Reset Password Error:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({ message: `Validation failed: ${messages.join(', ')}` });
    }
    res.status(500).json({ message: 'An internal error occurred.' });
  }
});

// OTHER ROUTES
router.get('/me', auth, async (req, res) => {
  try {
    // Check both collections for user data
    let user = await User.findById(req.userId).select('-password -__v -passwordResetToken -passwordResetExpires');
    let userType = 'regular';
    
    if (!user) {
      user = await DummyUser.findById(req.userId).select('-password -__v -passwordResetToken -passwordResetExpires');
      userType = 'dummy';
    }

    if (!user) {
      res.clearCookie('token');
      return res.status(404).json({ message: 'User not found.' });
    }

    // Convert to plain object and add type info if needed
    const userResponse = user.toObject();
    if (userType === 'dummy') {
      userResponse.isDummy = true;
    }

    res.json({ user: userResponse });
  } catch (err) {
    console.error('Get Me Error:', err);
    res.status(500).json({ message: 'Server error retrieving user data.' });
  }
});

router.post('/logout', (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout attempted.' });
  }
});

export default router;