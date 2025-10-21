// Backend/models/CaseProposal.js
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const caseProposalSchema = new Schema({
  // The client who sent the proposal
  client: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // The lawyer who received it
  lawyer: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // The case details/cover letter
  description: { 
    type: String, 
    required: true, 
    maxlength: 5000 
  },
  // Status of the proposal
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
    required: true,
  },
}, { timestamps: true });

caseProposalSchema.index({ client: 1, lawyer: 1 }); // Index for fast lookups

const CaseProposal = mongoose.model("CaseProposal", caseProposalSchema);
export default CaseProposal;