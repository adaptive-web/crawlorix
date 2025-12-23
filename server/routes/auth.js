import express from 'express';
import passport from 'passport';

const router = express.Router();

// Initiate Google OAuth login
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Google OAuth callback
router.get('/google/callback',
  (req, res, next) => {
    console.log('[Auth Callback] Starting authentication...');
    passport.authenticate('google', (err, user, info) => {
      console.log('[Auth Callback] Result - err:', err, 'user:', user?.email, 'info:', info);
      
      if (err) {
        console.error('[Auth Callback] Error:', err);
        return res.redirect('/login.html?error=auth_error');
      }
      
      if (!user) {
        console.log('[Auth Callback] No user returned, info:', info);
        return res.redirect('/login.html?error=no_user');
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('[Auth Callback] Login error:', loginErr);
          return res.redirect('/login.html?error=login_error');
        }
        
        console.log('[Auth Callback] Login successful, session:', req.sessionID, 'user:', req.user?.email);
        console.log('[Auth Callback] isAuthenticated:', req.isAuthenticated());
        
        // Save session explicitly before redirect
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('[Auth Callback] Session save error:', saveErr);
          }
          console.log('[Auth Callback] Session saved, redirecting to /');
          res.redirect('/');
        });
      });
    })(req, res, next);
  }
);

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
});

// Get current user info
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

export default router;
