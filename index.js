// Backend/index.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import Routes
import authRoutes from './routes/auth.js';
// --- MODIFICATION START ---
import userRoutes from './routes/users.js';
import connectionRoutes from './routes/connections.js';
import proposalRoutes from './routes/proposals.js';
import chatRoutes from './routes/chat.js';
// --- MODIFICATION END ---


dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch(console.error);

// Use Routes
app.use('/api/auth', authRoutes);
// --- MODIFICATION START ---
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/chat', chatRoutes);
// --- MODIFICATION END ---


const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});