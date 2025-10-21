// Backend/routes/users.js
import { Router } from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js'; // To protect routes

const router = Router();

// GET a list of users, filterable by role
// e.g., /api/users?role=lawyer
router.get('/', auth, async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role && ['client', 'lawyer', 'student', 'advisor'].includes(role)) {
      filter.role = role;
    }

    // Find users, but don't send back their passwords!
    const users = await User.find(filter).select('-password -passwordResetToken -passwordResetExpires');
    res.json(users);
  } catch (err) {
    console.error('Get Users Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a specific user's public profile
router.get('/profile/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -passwordResetToken -passwordResetExpires');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get User Profile Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// TODO: Add a PUT route for users to update their own profile (bio, etc.)
// router.put('/profile', auth, async (req, res) => { ... });

export default router;