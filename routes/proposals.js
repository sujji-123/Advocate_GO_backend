// Backend/routes/proposals.js
import { Router } from 'express';
import CaseProposal from '../models/CaseProposal.js';
import auth from '../middleware/auth.js';

const router = Router();

// Client: Send a new case proposal to a lawyer
router.post('/', auth, async (req, res) => {
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
    
    // Populate the response
    await proposal.populate('lawyer', 'name specialization');
    
    res.status(201).json({ 
      message: 'Case proposal sent.', 
      proposal: {
        ...proposal.toObject(),
        id: proposal._id.toString()
      }
    });
  } catch (err) {
    console.error('Create Proposal Error:', err);
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
    }).populate('client', 'name email profile');
    
    const formattedProposals = proposals.map(proposal => ({
      ...proposal.toObject(),
      id: proposal._id.toString(),
      client: proposal.client ? {
        ...proposal.client.toObject(),
        id: proposal.client._id.toString()
      } : null
    }));
    
    res.json(formattedProposals);
  } catch (err) {
    console.error('Get Proposal Inbox Error:', err);
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
    }).populate('lawyer', 'name specialization profile');
    
    const formattedProposals = proposals.map(proposal => ({
      ...proposal.toObject(),
      id: proposal._id.toString(),
      lawyer: proposal.lawyer ? {
        ...proposal.lawyer.toObject(),
        id: proposal.lawyer._id.toString()
      } : null
    }));
    
    console.log(`Found ${proposals.length} sent proposals for client ${req.userId}`);
    res.json(formattedProposals);
  } catch (err) {
    console.error('Get Sent Proposals Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lawyer: Respond to a proposal
router.put('/respond/:proposalId', auth, async (req, res) => {
  if (req.userRole !== 'lawyer') {
    return res.status(403).json({ message: 'Only lawyers can respond.' });
  }
  
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    const proposal = await CaseProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found.' });
    }
    
    if (proposal.lawyer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    proposal.status = status;
    await proposal.save();
    
    res.json({ 
      message: `Proposal ${status}.`, 
      proposal: {
        ...proposal.toObject(),
        id: proposal._id.toString()
      }
    });
  } catch (err) {
    console.error('Respond to Proposal Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;