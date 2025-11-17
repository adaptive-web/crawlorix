import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { drizzle } from 'npm:drizzle-orm@0.29.3/postgres-js';
import postgres from 'npm:postgres@3.4.3';
import { pgTable, text, timestamp, integer } from 'npm:drizzle-orm@0.29.3/pg-core';
import { desc } from 'npm:drizzle-orm@0.29.3';

const databaseInstances = pgTable('database_instances', {
  id: text('id').primaryKey(),
  created_date: timestamp('created_date').defaultNow().notNull(),
  updated_date: timestamp('updated_date').defaultNow().notNull(),
  created_by: text('created_by'),
  instance_type: text('instance_type').notNull().default('augmentor'),
  name: text('name').notNull(),
  description: text('description'),
  zilliz_endpoint: text('zilliz_endpoint').notNull(),
  zilliz_token: text('zilliz_token').notNull(),
  collection_name: text('collection_name').notNull(),
  embedding_model_name: text('embedding_model_name').default('text-embedding-3-large'),
  primary_key_field: text('primary_key_field').default('id'),
  query_filter: text('query_filter'),
  target_field: text('target_field'),
  vector_field_name: text('vector_field_name'),
  ai_operation: text('ai_operation'),
  prompt: text('prompt'),
  generative_model_name: text('generative_model_name').default('gpt-4o'),
  status: text('status').notNull().default('active'),
  schedule_interval: integer('schedule_interval').default(0),
  last_run: timestamp('last_run'),
  top_k: integer('top_k').default(5),
});

Deno.serve(async (req) => {
    let client;
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const connectionString = Deno.env.get('DATABASE_URL');
        if (!connectionString) {
            return Response.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
        }

        client = postgres(connectionString, { ssl: 'require', max: 1 });
        const db = drizzle(client);
        
        const instances = await db.select().from(databaseInstances).orderBy(desc(databaseInstances.created_date));

        return Response.json({ data: instances });
    } catch (error) {
        console.error('List instances error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    } finally {
        if (client) await client.end();
    }
});