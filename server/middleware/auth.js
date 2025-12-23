// Authentication middleware using Google OAuth via Passport

const isProduction = process.env.NODE_ENV === 'production';

export function requireAuth(req, res, next) {
  // Debug logging only in development
  if (!isProduction) {
    console.log(`[Auth] Path: ${req.path}, isAuthenticated: ${req.isAuthenticated?.()}, sessionID: ${req.sessionID}, user: ${req.user?.email || 'none'}`);
  }
  
  // Check if user is authenticated via Passport session
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    if (!isProduction) {
      console.log(`[Auth] Not authenticated - session exists: ${!!req.session}`);
    }
    // For API requests, return JSON error
    if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        error: 'Unauthorized - Please sign in with your @adaptive.co.uk Google account',
        requiresAuth: true
      });
    }
    // For page requests, redirect to login page
    return res.redirect('/login.html');
  }

  // Verify user has @adaptive.co.uk email (double-check even though passport should enforce this)
  if (!req.user || !req.user.email || !req.user.email.endsWith('@adaptive.co.uk')) {
    console.error(`[Auth] Invalid user email attempted access: ${req.user?.email}`);
    return res.status(403).json({
      error: 'Access denied - Only @adaptive.co.uk email addresses are allowed',
      requiresAuth: true
    });
  }

  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    // For now, all @adaptive.co.uk users are admins
    // You can add role-based access later if needed
    next();
  });
}
