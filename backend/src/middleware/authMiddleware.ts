import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase'; // Import initialized Firebase Admin SDK

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

/**
 * Middleware to verify Firebase ID token.
 * If valid, attaches the decoded token to req.user.
 * If invalid or missing, sends a 401 or 403 response.
 */
const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    console.log('No or invalid Authorization header');
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const idToken = authorizationHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Attach decoded token to request object
    console.log(`Authenticated user: ${decodedToken.uid}`);
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(403).json({ error: 'Forbidden: Invalid token' });
  }
};

export default authMiddleware; 