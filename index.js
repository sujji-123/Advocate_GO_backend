import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import connectionRoutes from './routes/connections.js';
import proposalRoutes from './routes/proposals.js';
import chatRoutes from './routes/chat.js';
import Message from './models/Message.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const corsOptions = {
    origin: process.env.CLIENT_URL,
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch(console.error);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/chat', chatRoutes);

// --- Socket.IO Event Handling ---
const userSockets = {};

const getConversationId = (userId1, userId2) => {
    // Ensure consistent order for conversation ID
    return [String(userId1), String(userId2)].sort().join('_');
};

io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id}`); // DEBUG

  socket.on('registerUser', (userId) => {
    if (userId) {
      userSockets[userId] = socket.id;
      console.log(`User ${userId} registered with socket ${socket.id}`); // DEBUG
    } else {
        console.warn(`Attempted to register user with invalid ID from socket ${socket.id}`);
    }
  });

  socket.on('joinChat', (otherUserId, selfId) => {
      if (!selfId || !otherUserId) {
          console.warn(`Invalid IDs for joinChat: selfId=${selfId}, otherUserId=${otherUserId}`); // DEBUG
          return;
      }
      const conversationId = getConversationId(selfId, otherUserId);
      socket.join(conversationId);
      console.log(`Socket ${socket.id} (User ${selfId}) joined room: ${conversationId}`); // DEBUG
  });

  socket.on('sendMessage', async (data) => {
    // --- DEBUG ---
    console.log("Received 'sendMessage' event with data:", data);
    // --- END DEBUG ---
    const { senderId, recipientId, content, tempClientOriginId } = data;
    if (!senderId || !recipientId || !content) {
        console.error("Missing data in sendMessage event:", data); // DEBUG
        socket.emit('messageError', { message: "Missing sender, recipient, or content." });
        return;
    }

    const conversationId = getConversationId(senderId, recipientId);
    console.log(`Attempting to save message for conversation: ${conversationId}`); // DEBUG

    try {
      const newMessage = new Message({
        conversationId,
        sender: senderId,
        recipient: recipientId,
        content,
      });
      const savedMessage = await newMessage.save(); // Get the saved message with _id and timestamps
      console.log("Message saved to DB:", savedMessage); // DEBUG

      // Populate sender info before emitting (optional but good for frontend)
      await savedMessage.populate('sender', 'name');

      // Include tempClientOriginId in the response for optimistic update matching
      const messageToSend = {
        ...savedMessage.toObject(),
        tempClientOriginId: tempClientOriginId || null
      };

      console.log(`Emitting 'receiveMessage' to room ${conversationId} with message:`, messageToSend); // DEBUG
      io.to(conversationId).emit('receiveMessage', messageToSend); // Send the *saved* message

    } catch (error) {
      console.error("Error saving/sending message:", error); // DEBUG
      socket.emit('messageError', { message: "Failed to save or send message." });
    }
  });

  socket.on('disconnect', (reason) => { // Added reason
    console.log(`Socket Disconnected: ${socket.id}, Reason: ${reason}`); // DEBUG
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        console.log(`User ${userId} unregistered.`); // DEBUG
        break;
      }
    }
  });
});
// --- End Socket.IO ---


const PORT = process.env.PORT || 8000; // Fixed port to match your running port
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});