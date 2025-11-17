import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { getDb } from '../db/client.js';
import { databaseInstances } from '../db/schema.js';
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

    const [instance] = await db.select().from(databaseInstances).where(eq(databaseInstances.id, id));

    if (!instance) {
      return Response.json({ error: 'Instance not found' }, { status: 404 });
    }

    return Response.json({ data: instance });
  } catch (error) {
    console.error('Get instance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});