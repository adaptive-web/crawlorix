import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { getDb } from '../db/client.js';
import { jobLogs } from '../db/schema.js';
import { eq, desc } from 'npm:drizzle-orm@0.29.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id } = await req.json();
    const db = getDb();

    const logs = await db.select()
      .from(jobLogs)
      .where(eq(jobLogs.job_id, job_id))
      .orderBy(desc(jobLogs.created_date));

    return Response.json({ data: logs });
  } catch (error) {
    console.error('Get job logs error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});