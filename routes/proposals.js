// Backend/routes/proposals.js
import { Router } from 'express';
import CaseProposal from '../models/CaseProposal.js';
import auth from '../middleware/auth.js'; // To protect routes

const router = Router();

// Client: Send a new case proposal to a lawyer
router.post('/', auth, async (req, res) => {
  // Only clients can send proposals
  if (req.userRole !== 'client') {
    return res.status(403).json({ message: 'Only clients can send case proposals.' });
  }

  const { lawyerId, description } = req.body;
  if (!lawyerId || !description) {
    return res.status(400).json({ message: 'Lawyer ID and description are required.' });
  }

  try {
    const proposal = new CaseProposal({
      client: req.userId,
      lawyer: lawyerId,
      description: description,
    });
    await proposal.save();
    res.status(201).json({ message: 'Case proposal sent.', proposal });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Lawyer: Get all proposals sent to me
router.get('/inbox', auth, async (req, res) => {
  if (req.userRole !== 'lawyer') {
    return res.status(403).json({ message: 'Only lawyers can view proposals.' });
  }
  try {
    const proposals = await CaseProposal.find({
      lawyer: req.userId,
    }).populate('client', 'name email'); // Show client info
    
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Client: Get all proposals I have sent
router.get('/sent', auth, async (req, res) => {
  if (req.userRole !== 'client') {
    return res.status(403).json({ message: 'Only clients can view sent proposals.' });
  }
  try {
    const proposals = await CaseProposal.find({
      client: req.userId,
    }).populate('lawyer', 'name specialization'); // Show lawyer info
    
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Lawyer: Respond to a proposal
router.put('/respond/:proposalId', auth, async (req, res) => {
  if (req.userRole !== 'lawyer') {
    return res.status(403).json({ message: 'Only lawyers can respond.' });
  }
  
  const { status } = req.body; // 'accepted' or 'declined'
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    const proposal = await CaseProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found.' });
    }
    // Make sure I am the lawyer for this proposal
    if (proposal.lawyer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    proposal.status = status;
    await proposal.save();
    
    // TODO: If accepted, automatically create a 'Connection'
    
    res.json({ message: `Proposal ${status}.`, proposal });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;