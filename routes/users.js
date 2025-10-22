// Backend/routes/users.js
import { Router } from 'express';
import User from '../models/User.js';
import DummyUser from '../models/DummyUser.js';
import auth from '../middleware/auth.js';

const router = Router();

// GET a list of users, filterable by role
router.get('/', auth, async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role && ['client', 'lawyer', 'student', 'advisor'].includes(role)) {
      filter.role = role;
    }

    // Get users from both collections
    const regularUsers = await User.find(filter).select('-password -passwordResetToken -passwordResetExpires');
    const dummyUsers = await DummyUser.find(filter).select('-password -passwordResetToken -passwordResetExpires');
    
    // Combine both user lists and add id field for consistency
    const allUsers = [...regularUsers, ...dummyUsers].map(user => ({
      ...user.toObject(),
      id: user._id.toString() // Add id field for frontend consistency
    }));

    console.log(`Found ${allUsers.length} users for role: ${role || 'all'}`);
    res.json(allUsers);
  } catch (err) {
    console.error('Get Users Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET a specific user's public profile
router.get('/profile/:id', auth, async (req, res) => {
  try {
    let user = await User.findById(req.params.id).select('-password -passwordResetToken -passwordResetExpires');
    if (!user) {
      user = await DummyUser.findById(req.params.id).select('-password -passwordResetToken -passwordResetExpires');
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Add id field for consistency
    const userResponse = {
      ...user.toObject(),
      id: user._id.toString()
    };
    
    res.json(userResponse);
  } catch (err) {
    console.error('Get User Profile Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;