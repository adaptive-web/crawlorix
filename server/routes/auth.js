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
    const isProduction = process.env.NODE_ENV === 'production';
    
    passport.authenticate('google', (err, user, info) => {
      if (!isProduction) {
        console.log('[Auth Callback] Result - user:', user?.email, 'info:', info);
      }
      
      if (err) {
        console.error('[Auth Callback] Error:', err);
        return res.redirect('/login.html?error=auth_error');
      }
      
      if (!user) {
        // Log domain restriction failures
        if (info?.message?.includes('adaptive.co.uk')) {
          console.log('[Auth Callback] Domain restriction - rejected email');
        }
        return res.redirect('/login.html?error=access_denied');
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('[Auth Callback] Login error:', loginErr);
          return res.redirect('/login.html?error=login_error');
        }
        
        // Save session explicitly before redirect
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('[Auth Callback] Session save error:', saveErr);
            return res.redirect('/login.html?error=session_error');
          }
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
