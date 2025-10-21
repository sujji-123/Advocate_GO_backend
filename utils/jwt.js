// Backend/utils/jwt.js

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in your .env file.');
}

// --- MODIFICATION START ---
// Updated signToken to include the user's role
export const signToken = (userId, role) => {
  const payload = {
    id: userId,
    role: role,
  };
  
  // Use the loaded JWT_SECRET variable here
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};
// --- MODIFICATION END ---