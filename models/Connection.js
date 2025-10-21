// Backend/models/Connection.js
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const connectionSchema = new Schema({
  // The user who sent the request
  requester: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // The user who received the request
  recipient: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // Status of the connection
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending',
    required: true,
  },
}, { timestamps: true });

// Ensure a user can't send multiple requests to the same person
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const Connection = mongoose.model("Connection", connectionSchema);
export default Connection;