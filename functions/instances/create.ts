import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { getDb, generateId } from '../db/client.js';
import { databaseInstances } from '../db/schema.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const db = getDb();

    const newInstance = {
      id: generateId(),
      created_by: user.email,
      created_date: new Date(),
      updated_date: new Date(),
      ...data,
    };

    await db.insert(databaseInstances).values(newInstance);

    return Response.json({ data: newInstance });
  } catch (error) {
    console.error('Create instance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});