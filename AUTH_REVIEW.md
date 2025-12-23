# Crawlorix Tech Stack & Auth Review

## Tech Stack Overview

### Backend
- **Runtime**: Node.js with ES modules
- **Framework**: Express.js 4.18
- **Database**: NeonDB (PostgreSQL serverless) via Drizzle ORM
- **Auth**: Passport.js with `passport-google-oauth20`
- **Token**: JWT via `jsonwebtoken`
- **Cookies**: `cookie-parser`

### Frontend
- **Framework**: React 18 + Vite 6
- **Routing**: React Router DOM 6
- **State**: React Context + TanStack Query
- **UI**: Radix UI + Tailwind CSS
- **Legacy**: @base44/sdk (appears unused for auth)

### Deployment
- **Platform**: Railway
- **URL**: crawlorix.href.co.uk
- **Auto-deploy**: Yes, from `main` branch

---

## Auth Flow (Current Implementation)

### 1. Login Initiation
- User visits `/login.html` (static HTML in `/public`)
- Clicks "Sign in with Google" → `/auth/google`

### 2. Google OAuth
- `passport.authenticate('google', { session: false })` redirects to Google
- Google returns to `GOOGLE_CALLBACK_URL`

### 3. Callback Handler (`/auth/google/callback`)
```
passport.authenticate() → signToken(user) → setAuthCookie(res, token) → redirect('/')
```

### 4. Frontend Auth Check
- React app loads, `AuthContext` calls `/api/auth/user`
- If 401, redirects to `/login`

### 5. Protected Routes
- `requireAuth` middleware checks `req.cookies.auth_token`
- Verifies JWT, checks `@adaptive.co.uk` domain

---

## ISSUES IDENTIFIED

### Issue 1: GOOGLE_CALLBACK_URL Mismatch
**Location**: `server/config/passport.js:22`

The `callbackURL` passed to GoogleStrategy is `process.env.GOOGLE_CALLBACK_URL`.

**Problem**: If this is set to `https://crawlorix.href.co.uk/auth/google/callback`, but the login page links to `/auth/google`, the OAuth flow works. BUT if the env var doesn't exactly match what's in Google Cloud Console, the callback fails silently.

**Verification needed**: Check Railway env var matches Google Cloud Console exactly.

---

### Issue 2: Two Login Pages, Inconsistent Paths
**Location**: `public/login.html:81` and `src/lib/AuthContext.jsx:68`

- `login.html` links to `/auth/google`
- `AuthContext.navigateToLogin()` redirects to `/login` (not `/login.html`)

**Problem**: `/login` may be handled by the React app (SPA), not the static `login.html`.

---

### Issue 3: Production Middleware Order
**Location**: `server/index.js:209-237`

```javascript
// 1. Serve public folder (login page) without auth
app.use(express.static(publicPath));

// 2. Auth check middleware
app.use((req, res, next) => { ... requireAuth ... });

// 3. Serve dist folder
app.use(express.static(distPath));

// 4. Catch-all
app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')));
```

**Problem**: The catch-all at step 4 serves `index.html` for ALL unmatched routes. This means:
- `/login` hits step 4, serves the React app
- React app checks auth, fails, redirects to `/login` → infinite loop potential
- The React app's `index.html` is served BEFORE the auth middleware can redirect properly

---

### Issue 4: navigateToLogin Uses Wrong Path
**Location**: `src/lib/AuthContext.jsx:67-69`

```javascript
const navigateToLogin = () => {
  window.location.href = '/login';
};
```

**Problem**: Should be `/login.html` to hit the static file, not the React SPA.

---

### Issue 5: Dead Code / Unused Dependencies
**Location**: `package.json`

```json
"express-session": "^1.18.0",  // Still in deps but not imported
"next-auth": "^4.24.13",        // Not used - this is Express, not Next.js
"@base44/sdk": "^0.8.3",        // Legacy, may interfere
```

**Problem**: Confusing dependencies suggest the codebase has been partially migrated. `express-session` was removed from imports but still in package.json.

---

### Issue 6: Vite Proxy Not Configured
**Location**: `vite.config.js`

No proxy configured for API routes in development.

**Problem**: In development, Vite runs on port 5173, server on 3000. Without a proxy, frontend `/api/*` calls fail unless CORS is set up perfectly.

---

## ROOT CAUSE ASSESSMENT

The most likely issue is **Issue 4 + Issue 3 combined**:

1. User logs in successfully via Google
2. Cookie is set, redirects to `/`
3. React app loads (`index.html` from dist)
4. `AuthContext` checks `/api/auth/user` - this should work
5. If check fails for any reason, calls `navigateToLogin()` → `/login`
6. `/login` is NOT `login.html`, it's the React SPA catch-all
7. React app loads again, auth check fails, redirect loop

**The fix**: `navigateToLogin()` should redirect to `/login.html`, not `/login`.

---

## ENVIRONMENT VARIABLES REQUIRED

```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=https://crawlorix.href.co.uk/auth/google/callback
SESSION_SECRET=xxx (or NEXTAUTH_SECRET or JWT_SECRET)
NODE_ENV=production
DATABASE_URL=xxx
```

---

## RECOMMENDED FIXES (Priority Order)

1. **Fix navigateToLogin path** - Change `/login` to `/login.html`
2. **Remove unused deps** - Clean up `express-session`, `next-auth`
3. **Add dev proxy** - Configure Vite proxy for `/api/*` and `/auth/*`
4. **Verify GOOGLE_CALLBACK_URL** - Must exactly match Google Cloud Console
