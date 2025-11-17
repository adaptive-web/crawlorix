import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { getDb, generateId } from './db/client.js';
import { jobs, databaseInstances } from './db/schema.js';
import { eq, and } from 'npm:drizzle-orm@0.29.3';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const db = getDb();

        console.log('[Scheduler] Starting scheduled run check...');

        // 1. Check for pending jobs and start them
        const pendingJobs = await db.select().from(jobs).where(eq(jobs.status, 'pending')).limit(10);
        
        console.log(`[Scheduler] Found ${pendingJobs.length} pending jobs`);

        for (const job of pendingJobs) {
            console.log(`[Scheduler] Starting pending job: ${job.id}`);
            try {
                await base44.asServiceRole.functions.invoke('processJobBatch', { job_id: job.id }, { noWait: true });
            } catch (error) {
                console.error(`[Scheduler] Failed to start job ${job.id}:`, error);
            }
        }

        // 2. Check for scheduled instances that need to run
        const now = new Date();
        const activeInstances = await db.select()
            .from(databaseInstances)
            .where(
                and(
                    eq(databaseInstances.status, 'active'),
                    eq(databaseInstances.instance_type, 'augmentor')
                )
            );

        console.log(`[Scheduler] Found ${activeInstances.length} active augmentor instances`);

        for (const instance of activeInstances) {
            // Skip if no schedule set
            if (!instance.schedule_interval || instance.schedule_interval === 0) {
                continue;
            }

            // Check if it's time to run
            const shouldRun = !instance.last_run || 
                (now - new Date(instance.last_run)) >= (instance.schedule_interval * 60 * 1000);

            if (shouldRun) {
                console.log(`[Scheduler] Creating scheduled job for instance: ${instance.name}`);
                
                try {
                    // Create new job
                    const newJob = {
                        id: generateId(),
                        created_date: now,
                        updated_date: now,
                        instance_id: instance.id,
                        status: 'pending',
                        execution_type: 'full_execution',
                        current_batch_offset: 0,
                        total_records: 0,
                        processed_records: 0,
                        failed_records: 0,
                        is_processing_batch: false,
                    };

                    await db.insert(jobs).values(newJob);

                    // Update instance last_run
                    await db.update(databaseInstances)
                        .set({ last_run: now, updated_date: now })
                        .where(eq(databaseInstances.id, instance.id));

                    // Trigger job processing
                    await base44.asServiceRole.functions.invoke('processJobBatch', { job_id: newJob.id }, { noWait: true });

                    console.log(`[Scheduler] Successfully created and started job ${newJob.id} for instance ${instance.name}`);
                } catch (error) {
                    console.error(`[Scheduler] Failed to create job for instance ${instance.id}:`, error);
                }
            }
        }

        console.log('[Scheduler] Scheduled run check completed');

        return Response.json({ 
            success: true, 
            message: 'Scheduler ran successfully',
            pending_jobs_started: pendingJobs.length,
            instances_checked: activeInstances.length
        });

    } catch (error) {
        console.error('[Scheduler] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});