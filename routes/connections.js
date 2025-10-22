// Backend/routes/connections.js
import { Router } from 'express';
import Connection from '../models/Connection.js';
import auth from '../middleware/auth.js';

const router = Router();

// Send a connection request
router.post('/request', auth, async (req, res) => {
  const { recipientId } = req.body;
  const requesterId = req.userId;

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
    
    // Populate the response
    await connection.populate('requester', 'name role specialization');
    
    res.status(201).json({ 
      message: 'Connection request sent.', 
      connection: {
        ...connection.toObject(),
        id: connection._id.toString()
      }
    });
  } catch (err) {
    console.error('Connection Request Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my pending incoming connection requests
router.get('/pending', auth, async (req, res) => {
  try {
    const requests = await Connection.find({
      recipient: req.userId,
      status: 'pending'
    }).populate('requester', 'name role specialization profile');
    
    const formattedRequests = requests.map(req => ({
      ...req.toObject(),
      id: req._id.toString(),
      requester: {
        ...req.requester.toObject(),
        id: req.requester._id.toString()
      }
    }));
    
    res.json(formattedRequests);
  } catch (err) {
    console.error('Get Pending Connections Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my accepted connections
router.get('/accepted', auth, async (req, res) => {
  try {
    const connections = await Connection.find({
      $or: [{ requester: req.userId }, { recipient: req.userId }],
      status: 'accepted'
    })
    .populate('requester', 'name role specialization profile')
    .populate('recipient', 'name role specialization profile');

    // Format the response to show the other person with proper IDs
    const friends = connections.map(conn => {
      const isRequester = conn.requester._id.toString() === req.userId;
      const otherPerson = isRequester ? conn.recipient : conn.requester;
      
      return {
        ...otherPerson.toObject(),
        id: otherPerson._id.toString(),
        connectionId: conn._id.toString()
      };
    });

    console.log(`Found ${friends.length} accepted connections for user ${req.userId}`);
    res.json(friends);
  } catch (err) {
    console.error('Get Accepted Connections Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Respond to a connection request
router.put('/respond/:requestId', auth, async (req, res) => {
  const { status } = req.body;
  const { requestId } = req.params;

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    const request = await Connection.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }
    
    if (request.recipient.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    request.status = status;
    await request.save();
    
    res.json({ 
      message: `Request ${status}.`, 
      connection: {
        ...request.toObject(),
        id: request._id.toString()
      }
    });
  } catch (err) {
    console.error('Respond to Connection Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;