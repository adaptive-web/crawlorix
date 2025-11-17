import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { drizzle } from 'npm:drizzle-orm@0.29.3/postgres-js';
import postgres from 'npm:postgres@3.4.3';
import { pgTable, text, timestamp, integer, boolean } from 'npm:drizzle-orm@0.29.3/pg-core';
import { desc } from 'npm:drizzle-orm@0.29.3';

const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),
  created_date: timestamp('created_date').defaultNow().notNull(),
  updated_date: timestamp('updated_date').defaultNow().notNull(),
  created_by: text('created_by'),
  instance_id: text('instance_id').notNull(),
  status: text('status').notNull().default('pending'),
  execution_type: text('execution_type').notNull().default('full_execution'),
  started_at: timestamp('started_at'),
  last_batch_at: timestamp('last_batch_at'),
  current_batch_offset: integer('current_batch_offset').default(0),
  total_records: integer('total_records').default(0),
  processed_records: integer('processed_records').default(0),
  failed_records: integer('failed_records').default(0),
  is_processing_batch: boolean('is_processing_batch').default(false),
  details: text('details'),
});

Deno.serve(async (req) => {
    let client;
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '20');

        const connectionString = Deno.env.get('DATABASE_URL');
        if (!connectionString) {
            return Response.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
        }

        client = postgres(connectionString, { ssl: 'require', max: 1 });
        const db = drizzle(client);
        
        const jobsList = await db.select().from(jobs).orderBy(desc(jobs.created_date)).limit(limit);

        return Response.json({ data: jobsList });
    } catch (error) {
        console.error('List jobs error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    } finally {
        if (client) await client.end();
    }
});