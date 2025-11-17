import { drizzle } from 'npm:drizzle-orm@0.29.3/postgres-js';
import postgres from 'npm:postgres@3.4.3';
import * as schema from './schema.js';

let db = null;

export function getDb() {
  if (!db) {
    const connectionString = Deno.env.get('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set. Please configure it in your app settings.');
    }
    
    try {
      const client = postgres(connectionString, {
        ssl: 'require',
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      
      db = drizzle(client, { schema });
    } catch (error) {
      console.error('Database connection error:', error);
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  }
  
  return db;
}

// Helper to generate UUIDs
export function generateId() {
  return crypto.randomUUID();
}