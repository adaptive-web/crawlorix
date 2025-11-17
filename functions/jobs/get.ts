import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { getDb } from '../db/client.js';
import { jobs } from '../db/schema.js';
import { eq } from 'npm:drizzle-orm@0.29.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    const db = getDb();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    return Response.json({ data: job });
  } catch (error) {
    console.error('Get job error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});