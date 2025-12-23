// Authentication middleware using JWT tokens
import { verifyToken, clearAuthCookie } from '../lib/jwt.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token;
  
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized - Please sign in with your @adaptive.co.uk Google account',
      requiresAuth: true
    });
  }

  const user = verifyToken(token);
  if (!user) {
    clearAuthCookie(res);
    return res.status(401).json({
      error: 'Invalid or expired token - Please sign in again',
      requiresAuth: true
    });
  }

  // Verify user has @adaptive.co.uk email
  if (!user.email || !user.email.endsWith('@adaptive.co.uk')) {
    clearAuthCookie(res);
    return res.status(403).json({
      error: 'Access denied - Only @adaptive.co.uk email addresses are allowed',
      requiresAuth: true
    });
  }

  // Attach user to request
  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    // For now, all @adaptive.co.uk users are admins
    next();
  });
}
