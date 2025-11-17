import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { Pool, neonConfig } from 'npm:@neondatabase/serverless@0.9.0';

// Configure for Deno Deploy
neonConfig.webSocketConstructor = WebSocket;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const connectionString = Deno.env.get('DATABASE_URL');
    if (!connectionString) {
      return Response.json({ 
        error: 'DATABASE_URL not set',
        details: 'Environment variable DATABASE_URL is missing'
      }, { status: 500 });
    }

    console.log('Testing Neon serverless driver connection...');

    try {
      const pool = new Pool({ connectionString });
      
      // Try a simple query
      const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
      
      await pool.end();
      
      return Response.json({ 
        success: true,
        message: 'Connection successful using Neon serverless driver!',
        database_info: {
          current_time: result.rows[0].current_time,
          postgres_version: result.rows[0].pg_version
        }
      });
      
    } catch (error) {
      return Response.json({
        success: false,
        error: error.message,
        details: error.stack?.substring(0, 1000),
        suggestion: 'Make sure DATABASE_URL is set to your NeonDB connection string (should start with postgres:// or postgresql://)'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack?.substring(0, 1000)
    }, { status: 500 });
  }
});