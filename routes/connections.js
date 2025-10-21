// Backend/routes/connections.js
import { Router } from 'express';
import Connection from '../models/Connection.js';
import auth from '../middleware/auth.js'; // To protect routes

const router = Router();

// Send a connection request
router.post('/request', auth, async (req, res) => {
  const { recipientId } = req.body;
  const requesterId = req.userId; // From auth middleware

  if (recipientId === requesterId) {
    return res.status(400).json({ message: "You cannot connect with yourself." });
  }

  try {
    // Check if a connection already exists
    const existing = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ]
    });

    if (existing) {
      return res.status(400).json({ message: 'A connection or request already exists.' });
    }

    const connection = new Connection({
      requester: requesterId,
      recipient: recipientId,
    });
    await connection.save();
    res.status(201).json({ message: 'Connection request sent.', connection });
  } catch (err) {
    console.error('Connection Request Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my pending *incoming* connection requests
router.get('/pending', auth, async (req, res) => {
  try {
    const requests = await Connection.find({
      recipient: req.userId,
      status: 'pending'
    }).populate('requester', 'name role specialization'); // Populate sender's info
    
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my *accepted* connections (my friends list)
router.get('/accepted', auth, async (req, res) => {
  try {
    const connections = await Connection.find({
      $or: [{ requester: req.userId }, { recipient: req.userId }],
      status: 'accepted'
    })
    .populate('requester', 'name role specialization')
    .populate('recipient', 'name role specialization');

    // Filter to show the *other* person, not myself
    const friends = connections.map(conn => {
      return conn.requester._id.toString() === req.userId ? conn.recipient : conn.requester;
    });

    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Respond to a connection request (Accept or Decline)
router.put('/respond/:requestId', auth, async (req, res) => {
  const { status } = req.body; // 'accepted' or 'declined'
  const { requestId } = req.params;

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    const request = await Connection.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }
    // Make sure I am the recipient of this request
    if (request.recipient.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    request.status = status;
    await request.save();
    res.json({ message: `Request ${status}.`, connection: request });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;