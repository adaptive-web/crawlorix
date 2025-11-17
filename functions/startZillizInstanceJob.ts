import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { getDb, generateId } from './db/client.js';
import { jobs, databaseInstances } from './db/schema.js';
import { eq } from 'npm:drizzle-orm@0.29.3';

// Helper function for Zilliz API calls
function zillizApiCall(endpoint, token, path, body, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    return fetch(`${endpoint}${path}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { instance_id } = await req.json();
        const db = getDb();

        const [instance] = await db.select().from(databaseInstances).where(eq(databaseInstances.id, instance_id));
        if (!instance) {
            return Response.json({ error: 'Instance not found' }, { status: 404 });
        }

        // Create job
        const newJob = {
            id: generateId(),
            created_by: user.email,
            created_date: new Date(),
            updated_date: new Date(),
            instance_id,
            status: 'pending',
            execution_type: 'full_execution',
            current_batch_offset: 0,
            total_records: 0,
            processed_records: 0,
            failed_records: 0,
            is_processing_batch: false,
        };

        await db.insert(jobs).values(newJob);

        // Trigger first batch asynchronously
        base44.asServiceRole.functions.invoke('processJobBatch', { job_id: newJob.id }, { noWait: true })
            .catch(err => console.error('Failed to trigger batch:', err));

        return Response.json({ data: { job_id: newJob.id, message: 'Job started successfully' } });
    } catch (error) {
        console.error('Start job error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});