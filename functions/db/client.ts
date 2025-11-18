import { neon } from 'npm:@neondatabase/serverless@0.9.0';
import { drizzle } from 'npm:drizzle-orm@0.29.3/neon-http';
import * as schema from './schema.js';

// Use HTTP driver for Deno Deploy - more reliable than WebSocket in serverless
export function getDb() {
  const connectionString = Deno.env.get('DATABASE_URL');
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set. Please configure it in your app settings.');
  }
  
  try {
    const sql = neon(connectionString);
    const db = drizzle(sql, { schema });
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
}

// Helper to generate UUIDs
export function generateId() {
  return crypto.randomUUID();
}