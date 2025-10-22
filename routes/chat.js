// Backend/routes/chat.js
import { Router } from 'express';
import Message from '../models/Message.js';
// Connection check might not be strictly needed now if rooms handle auth, but can be kept
// import Connection from '../models/Connection.js'; 
import auth from '../middleware/auth.js';

const router = Router();

// Helper to create a consistent Conversation ID
const getConversationId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

// --- REMOVED POST /send route --- 
// Sending is now handled via Socket.IO in index.js

// Get chat history with another user (Keep this)
router.get('/:otherUserId', auth, async (req, res) => {
  const selfId = req.userId;
  const otherUserId = req.params.otherUserId;

  if (!otherUserId) {
    return res.status(400).json({ message: "Other user ID is required." });
  }

  try {
    const conversationId = getConversationId(selfId, otherUserId);

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 }) // Get messages in chronological order
      .populate('sender', 'name'); // Get sender's name

    res.json(messages);
  } catch (err) {
    console.error("Get Chat History Error:", err);
    res.status(500).json({ message: 'Server error fetching chat history' });
  }
});

export default router;