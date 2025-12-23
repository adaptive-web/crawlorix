// Authentication middleware using JWT tokens
import { verifyToken, clearAuthCookie } from '../lib/jwt.js';
import { checkUserAppAccess, isUserAdmin } from '../lib/platform-db.js';

const APP_ID = 'crawlorix';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token;
  
  // Check if this is an API request or a page request
  const isApiRequest = req.path.startsWith('/api/') || 
                       req.xhr || 
                       req.headers.accept?.includes('application/json');
  
  if (!token) {
    if (isApiRequest) {
      return res.status(401).json({
        error: 'Unauthorized - Please sign in with your @adaptive.co.uk Google account',
        requiresAuth: true
      });
    }
    return res.redirect('/login.html');
  }

  const user = verifyToken(token);
  if (!user) {
    clearAuthCookie(res);
    if (isApiRequest) {
      return res.status(401).json({
        error: 'Invalid or expired token - Please sign in again',
        requiresAuth: true
      });
    }
    return res.redirect('/login.html');
  }

  // Verify user has @adaptive.co.uk email
  if (!user.email || !user.email.endsWith('@adaptive.co.uk')) {
    clearAuthCookie(res);
    return res.status(403).json({
      error: 'Access denied - Only @adaptive.co.uk email addresses are allowed',
      requiresAuth: true
    });
  }

  // Check if user has access to this app (admins always have access)
  const admin = await isUserAdmin(user.email);
  if (!admin) {
    const hasAccess = await checkUserAppAccess(user.email, APP_ID);
    if (!hasAccess) {
      if (isApiRequest) {
        return res.status(403).json({
          error: 'Access denied - You do not have access to this app',
          requiresAuth: true
        });
      }
      return res.redirect('/no-access.html');
    }
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
