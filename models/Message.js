// Backend/models/Message.js
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  // We'll create a single "conversation" ID to group messages
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  sender: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipient: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  read: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;