import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { getDb } from '../db/client.js';
import { databaseInstances } from '../db/schema.js';
import { desc } from 'npm:drizzle-orm@0.29.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const instances = await db.select().from(databaseInstances).orderBy(desc(databaseInstances.created_date));

    return Response.json({ data: instances });
  } catch (error) {
    console.error('List instances error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});