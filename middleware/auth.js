// Backend/middleware/auth.js

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export default function auth(req,res,next) {
    // --- MODIFICATION START ---
    // Check headers first, then cookies, for flexibility
    let token = req.cookies.token;
    if (!token && req.header('Authorization')) {
      const authHeader = req.header('Authorization');
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7, authHeader.length);
      }
    }
    // --- MODIFICATION END ---

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized. No token provided.' });
    }
    
    try {
        // eslint-disable-next-line no-undef
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // --- MODIFICATION START ---
        // Attach user ID and Role to the request object
        req.userId = decoded.id;
        req.userRole = decoded.role;
        // --- MODIFICATION END ---

        next();
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token.' });
    }
}