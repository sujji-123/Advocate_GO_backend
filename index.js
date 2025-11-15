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
import dummyAuthRoutes from './routes/dummy-auth.js';
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

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });


app.use('/api/auth', authRoutes);
app.use('/api/dummy-auth', dummyAuthRoutes); 
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/chat', chatRoutes);


const userSockets = {};

const getConversationId = (userId1, userId2) => {
 
  return [String(userId1), String(userId2)].sort().join('_');
};

io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  socket.on('registerUser', (userId) => {
    if (userId) {
      userSockets[userId] = socket.id;
      console.log(`User ${userId} registered with socket ${socket.id}`);
    } else {
      console.warn(`Attempted to register user with invalid ID from socket ${socket.id}`);
    }
  });

  socket.on('joinChat', (otherUserId, selfId) => {
    if (!selfId || !otherUserId) {
      console.warn(`Invalid IDs for joinChat: selfId=${selfId}, otherUserId=${otherUserId}`);
      return;
    }
    const conversationId = getConversationId(selfId, otherUserId);
    socket.join(conversationId);
    console.log(`Socket ${socket.id} (User ${selfId}) joined room: ${conversationId}`);
  });

  socket.on('sendMessage', async (data) => {
    console.log("Received 'sendMessage' event with data:", data); 

    const { senderId, recipientId, content, tempClientOriginId } = data;
    if (!senderId || !recipientId || !content) {
      console.error("Missing data in sendMessage event:", data); 
      socket.emit('messageError', { message: "Missing sender, recipient, or content." });
      return;
    }

    const conversationId = getConversationId(senderId, recipientId);
    console.log(`Attempting to save message for conversation: ${conversationId}`);

    try {
      const newMessage = new Message({
        conversationId,
        sender: senderId,
        recipient: recipientId,
        content,
      });
      const savedMessage = await newMessage.save(); 
      console.log("Message saved to DB:", savedMessage);

      await savedMessage.populate('sender', 'name');

      const messageToSend = {
        ...savedMessage.toObject(),
        tempClientOriginId: tempClientOriginId || null
      };

      console.log(`Emitting 'receiveMessage' to room ${conversationId} with message:`, messageToSend); 
      io.to(conversationId).emit('receiveMessage', messageToSend);
    } catch (error) {
      console.error("Error saving/sending message:", error); 
      socket.emit('messageError', { message: "Failed to save or send message." });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket Disconnected: ${socket.id}, Reason: ${reason}`); 
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        console.log(`User ${userId} unregistered.`); 
        break;
      }
    }
  });
});
