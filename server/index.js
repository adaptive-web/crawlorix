import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import instancesRouter from './routes/instances.js';
import jobsRouter from './routes/jobs.js';
import queryRouter from './routes/query.js';
import augmentorRouter from './routes/augmentor.js';
import authRouter from './routes/auth.js';
import { configurePassport } from './config/passport.js';
import { startScheduler } from './workers/scheduler.js';
import { requireAuth } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Start batch job scheduler
if (process.env.ENABLE_SCHEDULER !== 'false') {
  startScheduler();
}

// Middleware
// CORS - restrict to specific origins in production
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['https://crawlorix.href.co.uk'];

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc) or from allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for Railway - MUST be before session middleware
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Session configuration - use SESSION_SECRET or fall back to NEXTAUTH_SECRET
const sessionSecret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
if (!sessionSecret) {
  console.error('WARNING: No SESSION_SECRET or NEXTAUTH_SECRET set!');
}
app.use(session({
  secret: sessionSecret || 'fallback-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Authentication Routes
app.use('/auth', authRouter);

// API Routes (protected by auth)
app.use('/api/instances', requireAuth, instancesRouter);
app.use('/api/jobs', requireAuth, jobsRouter);
app.use('/api/query', requireAuth, queryRouter);
app.use('/api/augmentor', requireAuth, augmentorRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// One-time migration: Update augmentors to GPT-3.5-turbo (protected)
app.all('/api/admin/update-to-gpt35', requireAuth, async (req, res) => {
  try {
    const { getDb } = await import('./db/client.js');
    const { databaseInstances } = await import('./db/schema.js');
    const { eq } = await import('drizzle-orm');

    const db = getDb();

    // Get all augmentor instances
    const instances = await db
      .select()
      .from(databaseInstances)
      .where(eq(databaseInstances.instance_type, 'augmentor'));

    const updates = [];
    for (const instance of instances) {
      await db
        .update(databaseInstances)
        .set({
          generative_model_name: 'gpt-3.5-turbo',
          updated_date: new Date()
        })
        .where(eq(databaseInstances.id, instance.id));

      updates.push({
        id: instance.id,
        name: instance.name,
        old_model: instance.generative_model_name,
        new_model: 'gpt-3.5-turbo'
      });
    }

    res.json({
      success: true,
      message: `Updated ${updates.length} augmentor instances to GPT-3.5-turbo`,
      updates
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List available Gemini models from Google API (protected)
app.all('/api/admin/list-gemini-models', requireAuth, async (req, res) => {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return res.status(400).json({ error: 'GOOGLE_API_KEY not configured' });
    }

    // Make direct API call to list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const modelList = data.models.map(m => ({
      name: m.name,
      displayName: m.displayName,
      description: m.description,
      supportedGenerationMethods: m.supportedGenerationMethods
    }));

    res.json({
      success: true,
      count: modelList.length,
      models: modelList
    });
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fix Gemini model names to use correct API model names (protected)
app.all('/api/admin/fix-gemini-models', requireAuth, async (req, res) => {
  try {
    const { getDb } = await import('./db/client.js');
    const { databaseInstances } = await import('./db/schema.js');
    const { eq } = await import('drizzle-orm');

    const db = getDb();

    // Get all instances
    const instances = await db.select().from(databaseInstances);

    const updates = [];
    for (const instance of instances) {
      const oldModel = instance.generative_model_name;
      let newModel = oldModel;

      // Fix old Gemini model names to use correct API names
      if (oldModel === 'gemini-1.5-flash' || oldModel === 'gemini-1.5-flash-latest') {
        newModel = 'gemini-flash-latest';
      } else if (oldModel === 'gemini-1.5-pro' || oldModel === 'gemini-1.5-pro-latest') {
        newModel = 'gemini-pro-latest';
      }

      if (newModel !== oldModel) {
        await db
          .update(databaseInstances)
          .set({
            generative_model_name: newModel,
            updated_date: new Date()
          })
          .where(eq(databaseInstances.id, instance.id));

        updates.push({
          id: instance.id,
          name: instance.name,
          old_model: oldModel,
          new_model: newModel
        });
      }
    }

    res.json({
      success: true,
      message: `Fixed ${updates.length} instances with old Gemini model names`,
      updates
    });
  } catch (error) {
    console.error('Fix Gemini models error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from Vite build (for production)
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  const publicPath = join(__dirname, '..', 'public');
  
  // Serve public folder (login page) without auth
  app.use(express.static(publicPath));
  
  // Protect all routes except auth, health, and login
  app.use((req, res, next) => {
    // Skip auth for auth routes, health check, login, and static assets
    if (req.path.startsWith('/auth') || 
        req.path === '/health' || 
        req.path === '/login.html' ||
        req.path.startsWith('/assets/') ||
        req.path.endsWith('.js') ||
        req.path.endsWith('.css') ||
        req.path.endsWith('.ico')) {
      return next();
    }
    // Require auth for everything else
    requireAuth(req, res, next);
  });
  
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
