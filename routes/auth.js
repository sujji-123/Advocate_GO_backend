// Backend/routes/auth.js

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../utils/mailer.js';
import auth from '../middleware/auth.js';
import { signToken } from '../utils/jwt.js';

const router = Router();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// -------------------------------------------------------------
// SIGNUP FLOW
// -------------------------------------------------------------

router.post('/signup-request-otp', async (req, res) => {
  try {
    const { email, role, specialization } = req.body;
    if (!email || !role) {
      return res.status(400).json({ message: 'Email and Role are required.' });
    }
    if (!['client', 'lawyer', 'student', 'advisor'].includes(role)) {
      return res.status(400).json({ message: 'Invalid user role.' });
    }
    if (role === 'lawyer' && !specialization) {
      return res.status(400).json({ message: 'Specialization is required for lawyers.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const OTP_CODE = generateOtp();
    const codeHash = await bcrypt.hash(OTP_CODE, 10);
    const OTP_LIFETIME_MIN = 10;

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
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const doc = await Otp.findOne({ identifier: email, consumed: false }).sort({ createdAt: -1 });
    if (!doc) return res.status(400).json({ message: 'No pending verification found. Please try again.' });
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
  // --- FIX: Removed the underscore from the catch block ---
  } catch (err) {
  // --- END FIX ---
    console.error('Signup Completion Error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }
    res.status(500).json({ message: 'Server error during account creation.' });
  }
});


// -------------------------------------------------------------
// LOGIN & PASSWORD RESET FLOW
// -------------------------------------------------------------
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter email and password.' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        if (!user.password) {
            return res.status(401).json({ message: 'Invalid credentials for this user account.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
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

        res.json({
            token,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              specialization: user.specialization
            },
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
        await user.save();
        await sendPasswordResetEmail(user.email, resetToken);
        res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({ message: 'Token is invalid or has expired.' });
        }
        if (!req.body.password) {
            return res.status(400).json({ message: 'Password is required.' });
        }
        user.password = await bcrypt.hash(req.body.password, 10);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        res.json({ success: true, message: 'Password has been updated successfully.' });
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// -------------------------------------------------------------
// OTHER ROUTES
// -------------------------------------------------------------
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v -password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Get Me Error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export default router;