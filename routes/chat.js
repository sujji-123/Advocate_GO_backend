// Backend/routes/chat.js
import { Router } from 'express';
import Message from '../models/Message.js';
import Connection from '../models/Connection.js';
import auth from '../middleware/auth.js';

const router = Router();

// Helper to create a consistent Conversation ID
const getConversationId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

// Send a message
router.post('/send', auth, async (req, res) => {
  const { recipientId, content } = req.body;
  const senderId = req.userId;

  if (!recipientId || !content) {
    return res.status(400).json({ message: 'Recipient and content are required.' });
  }

  try {
    // 1. Check if users are connected
    const conversationId = getConversationId(senderId, recipientId);
    const connection = await Connection.findOne({
      $or: [
        { requester: senderId, recipient: recipientId },
        { requester: recipientId, recipient: senderId }
      ],
      status: 'accepted'
    });

    if (!connection) {
      return res.status(403).json({ message: 'You are not connected with this user.' });
    }

    // 2. Create and save the message
    const message = new Message({
      conversationId,
      sender: senderId,
      recipient: recipientId,
      content,
    });
    await message.save();
    
    // TODO: Emit this message via WebSocket
    
    res.status(201).json({ message: 'Message sent.', sentMessage: message });

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat history with another user
router.get('/:otherUserId', auth, async (req, res) => {
  const selfId = req.userId;
  const otherUserId = req.params.otherUserId;

  try {
    const conversationId = getConversationId(selfId, otherUserId);

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 }) // Get messages in chronological order
      .populate('sender', 'name'); // Get sender's name

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;