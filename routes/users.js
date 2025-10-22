// Backend/routes/users.js
import { Router } from 'express';
import User from '../models/User.js';
import DummyUser from '../models/DummyUser.js'; // ADD THIS IMPORT
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

    // MODIFIED: Get users from both collections
    const regularUsers = await User.find(filter).select('-password -passwordResetToken -passwordResetExpires');
    const dummyUsers = await DummyUser.find(filter).select('-password -passwordResetToken -passwordResetExpires');
    
    // Combine both user lists
    const allUsers = [...regularUsers, ...dummyUsers];
    
    res.json(allUsers);
  } catch (err) {
    console.error('Get Users Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a specific user's public profile
router.get('/profile/:id', auth, async (req, res) => {
  try {
    // MODIFIED: Check both collections
    let user = await User.findById(req.params.id).select('-password -passwordResetToken -passwordResetExpires');
    if (!user) {
      user = await DummyUser.findById(req.params.id).select('-password -passwordResetToken -passwordResetExpires');
    }
    
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