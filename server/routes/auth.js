import express from 'express';
import passport from 'passport';
import { signToken, setAuthCookie, clearAuthCookie, verifyToken } from '../lib/jwt.js';

const router = express.Router();

// Initiate Google OAuth login
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

// Google OAuth callback - route matches /api/auth/callback/google
router.get('/callback/google',
  passport.authenticate('google', {
    failureRedirect: '/login.html?error=access_denied',
    session: false
  }),
  (req, res) => {
    // Create JWT token and set as cookie
    const token = signToken(req.user);
    setAuthCookie(res, token);
    // Redirect to dashboard
    res.redirect('/');
  }
);

// Logout route
router.get('/logout', (req, res) => {
  clearAuthCookie(res);
  res.redirect('/login.html');
});

// Get current user info
router.get('/user', (req, res) => {
  const token = req.cookies?.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = verifyToken(token);
  if (!user) {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  res.json({ user });
});

export default router;
