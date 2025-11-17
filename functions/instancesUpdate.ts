import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { getDb } from './db/client.js';
import { databaseInstances } from './db/schema.js';
import { eq } from 'npm:drizzle-orm@0.29.3';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, data: updateData } = await req.json();
        const db = getDb();

        const updatedInstance = {
            ...updateData,
            updated_date: new Date()
        };

        await db.update(databaseInstances)
            .set(updatedInstance)
            .where(eq(databaseInstances.id, id));

        const [result] = await db.select().from(databaseInstances).where(eq(databaseInstances.id, id));

        return Response.json({ data: result });
    } catch (error) {
        console.error('Update instance error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});