import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export function configurePassport() {
  // Validate required environment variables
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error('FATAL: GOOGLE_CLIENT_ID is not set');
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    console.error('FATAL: GOOGLE_CLIENT_SECRET is not set');
  }
  if (!process.env.GOOGLE_CALLBACK_URL) {
    console.error('FATAL: GOOGLE_CALLBACK_URL is not set - must be full URL like https://crawlorix.href.co.uk/auth/google/callback');
  }

  // Serialize user into session
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // Deserialize user from session
  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  // Configure Google OAuth Strategy
  // IMPORTANT: callbackURL MUST be a full absolute URL matching Google Cloud Console
  const callbackURL = process.env.GOOGLE_CALLBACK_URL;
  if (!callbackURL || !callbackURL.startsWith('http')) {
    console.error('ERROR: GOOGLE_CALLBACK_URL must be a full URL (e.g., https://crawlorix.href.co.uk/auth/google/callback)');
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackURL,
      },
      (accessToken, refreshToken, profile, done) => {
        // Extract email from profile
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        // Check if email ends with @adaptive.co.uk
        if (!email || !email.endsWith('@adaptive.co.uk')) {
          return done(null, false, {
            message: 'Access denied. Only @adaptive.co.uk email addresses are allowed.'
          });
        }

        // Create user object
        const user = {
          id: profile.id,
          email: email,
          name: profile.displayName,
          picture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        };

        return done(null, user);
      }
    )
  );
}

export default passport;
