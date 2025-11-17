import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { getDb } from '../db/client.js';
import { jobs } from '../db/schema.js';
import { desc } from 'npm:drizzle-orm@0.29.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const db = getDb();
    const jobsList = await db.select()
      .from(jobs)
      .orderBy(desc(jobs.created_date))
      .limit(limit);

    return Response.json({ data: jobsList });
  } catch (error) {
    console.error('List jobs error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});