import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { getDb, generateId } from './client.js';
import { databaseInstances, jobs, jobLogs } from './schema.js';
import { sql } from 'npm:drizzle-orm@0.29.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = getDb();

    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS database_instances (
        id TEXT PRIMARY KEY,
        created_date TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_date TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by TEXT,
        instance_type TEXT NOT NULL DEFAULT 'augmentor',
        name TEXT NOT NULL,
        description TEXT,
        zilliz_endpoint TEXT NOT NULL,
        zilliz_token TEXT NOT NULL,
        collection_name TEXT NOT NULL,
        embedding_model_name TEXT DEFAULT 'text-embedding-3-large',
        primary_key_field TEXT DEFAULT 'id',
        query_filter TEXT,
        target_field TEXT,
        vector_field_name TEXT,
        ai_operation TEXT,
        prompt TEXT,
        generative_model_name TEXT DEFAULT 'gpt-4o',
        status TEXT NOT NULL DEFAULT 'active',
        schedule_interval INTEGER DEFAULT 0,
        last_run TIMESTAMP,
        top_k INTEGER DEFAULT 5
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        created_date TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_date TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by TEXT,
        instance_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        execution_type TEXT NOT NULL DEFAULT 'full_execution',
        started_at TIMESTAMP,
        last_batch_at TIMESTAMP,
        current_batch_offset INTEGER DEFAULT 0,
        total_records INTEGER DEFAULT 0,
        processed_records INTEGER DEFAULT 0,
        failed_records INTEGER DEFAULT 0,
        is_processing_batch BOOLEAN DEFAULT false,
        details TEXT
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS job_logs (
        id TEXT PRIMARY KEY,
        created_date TIMESTAMP DEFAULT NOW() NOT NULL,
        job_id TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'INFO',
        message TEXT NOT NULL
      )
    `);

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_jobs_instance_id ON jobs(instance_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_instances_status ON database_instances(status)`);

    return Response.json({ 
      success: true, 
      message: 'Tables created successfully. You can now use the app with NeonDB!' 
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to create tables. Make sure DATABASE_URL is correct.'
    }, { status: 500 });
  }
});