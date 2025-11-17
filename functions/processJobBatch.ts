import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai@4.28.0';
import { getDb, generateId } from './db/client.js';
import { jobs, databaseInstances, jobLogs } from './db/schema.js';
import { eq } from 'npm:drizzle-orm@0.29.3';

const BATCH_SIZE = 2;
const MAX_CONTENT_LENGTH = 12000;

// Utility functions
function withTimeout(promise, timeoutMs) {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(operation, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
}

function zillizApiCall(endpoint, token, path, body, timeout = 30000) {
    return withRetry(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(`${endpoint}${path}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Zilliz API error (${response.status}): ${errorText}`);
            }

            let responseText = await response.text();
            responseText = responseText.replace(/"id":\s*(\d{15,})/g, '"id":"$1"');
            return JSON.parse(responseText);
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    });
}

Deno.serve(async (req) => {
    const db = getDb();
    const base44 = createClientFromRequest(req);

    try {
        const { job_id } = await req.json();
        console.log(`[processJobBatch] Starting batch processing for job: ${job_id}`);

        // Get job
        const [job] = await db.select().from(jobs).where(eq(jobs.id, job_id));
        if (!job) {
            return Response.json({ error: 'Job not found' }, { status: 404 });
        }

        if (job.status === 'cancelled') {
            console.log(`[processJobBatch] Job ${job_id} is cancelled, stopping.`);
            return Response.json({ message: 'Job cancelled' });
        }

        // Get instance
        const [instance] = await db.select().from(databaseInstances).where(eq(databaseInstances.id, job.instance_id));
        if (!instance) {
            await db.update(jobs)
                .set({ status: 'failed', details: 'Instance not found', updated_date: new Date() })
                .where(eq(jobs.id, job_id));
            return Response.json({ error: 'Instance not found' }, { status: 404 });
        }

        // Log helper
        const addLog = async (message, level = 'INFO') => {
            console.log(`[${level}] ${message}`);
            await db.insert(jobLogs).values({
                id: generateId(),
                job_id,
                level,
                message,
                created_date: new Date()
            });
        };

        // Initialize job if needed
        if (job.status === 'pending') {
            await db.update(jobs)
                .set({ status: 'running', started_at: new Date(), updated_date: new Date() })
                .where(eq(jobs.id, job_id));
            await addLog('Job started');
        }

        // Fetch batch
        await addLog(`Fetching batch at offset ${job.current_batch_offset} (batch size: ${BATCH_SIZE})`);

        const queryBody = {
            collectionName: instance.collection_name,
            filter: instance.query_filter || '',
            offset: job.current_batch_offset,
            limit: BATCH_SIZE,
            outputFields: ['*']
        };

        const queryResponse = await zillizApiCall(
            instance.zilliz_endpoint,
            instance.zilliz_token,
            '/v2/vectordb/entities/query',
            queryBody
        );

        const records = queryResponse.data || [];
        await addLog(`Fetched ${records.length} records`);

        if (records.length === 0) {
            await db.update(jobs)
                .set({ status: 'completed', details: 'All records processed', updated_date: new Date() })
                .where(eq(jobs.id, job_id));
            await addLog('Job completed - no more records to process');
            return Response.json({ message: 'Job completed' });
        }

        // Process batch with AI
        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
        
        const batchPrompts = records.map((record, idx) => {
            let content = record[instance.target_field] || '';
            const tagRegex = /\[pagecontent\](.*?)\[\/pagecontent\]/gs;
            const match = tagRegex.exec(content);
            if (match) {
                content = match[1];
            }
            
            if (content.length > MAX_CONTENT_LENGTH) {
                content = content.substring(0, MAX_CONTENT_LENGTH);
            }

            const promptWithContent = instance.prompt.replace(/\{\{FIELD_VALUE\}\}/g, content);
            return `[RECORD ${idx + 1}]\n${promptWithContent}`;
        });

        const combinedPrompt = batchPrompts.join('\n\n---\n\n');
        
        await addLog('Sending batch to OpenAI for processing...');

        let aiResponses = [];
        try {
            const aiResult = await withTimeout(
                withRetry(async () => {
                    return await openai.chat.completions.create({
                        model: instance.generative_model_name,
                        messages: [
                            { role: 'system', content: 'Process each record separately. Return responses in the format: [RECORD X]\n<processed content>' },
                            { role: 'user', content: combinedPrompt }
                        ],
                        temperature: 0.3,
                    });
                }),
                90000
            );

            const fullResponse = aiResult.choices[0].message.content;
            const recordResponses = fullResponse.split(/\[RECORD \d+\]/);
            aiResponses = recordResponses.slice(1).map(r => r.trim());

            if (aiResponses.length !== records.length) {
                throw new Error(`AI returned ${aiResponses.length} responses but expected ${records.length}`);
            }

            await addLog(`AI processing completed for ${aiResponses.length} records`);

        } catch (batchError) {
            await addLog(`Batch AI processing failed: ${batchError.message}. Skipping this batch.`, 'ERROR');
            
            const newOffset = job.current_batch_offset + records.length;
            const newFailedRecords = job.failed_records + records.length;

            await db.update(jobs).set({
                current_batch_offset: newOffset,
                failed_records: newFailedRecords,
                last_batch_at: new Date(),
                updated_date: new Date()
            }).where(eq(jobs.id, job_id));

            base44.asServiceRole.functions.invoke('processJobBatch', { job_id }, { noWait: true })
                .catch(err => console.error('Failed to trigger next batch:', err));

            return Response.json({ message: 'Batch failed, moving to next' });
        }

        // Process each record
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const processedContent = aiResponses[i];
            const recordId = record[instance.primary_key_field];

            await addLog(`Record ${recordId}: Processing...`);

            try {
                let updatedContent = processedContent;
                const originalContent = record[instance.target_field] || '';
                const tagRegex = /\[pagecontent\](.*?)\[\/pagecontent\]/gs;
                
                if (tagRegex.test(originalContent)) {
                    updatedContent = originalContent.replace(tagRegex, `[pagecontent]${processedContent}[/pagecontent]`);
                }

                const updatedRecord = { ...record, [instance.target_field]: updatedContent };

                if (instance.vector_field_name) {
                    await addLog(`Record ${recordId}: Generating embedding...`);
                    const embeddingResult = await withRetry(async () => {
                        return await openai.embeddings.create({
                            model: instance.embedding_model_name,
                            input: processedContent
                        });
                    });
                    updatedRecord[instance.vector_field_name] = embeddingResult.data[0].embedding;
                }

                await zillizApiCall(
                    instance.zilliz_endpoint,
                    instance.zilliz_token,
                    '/v2/vectordb/entities/delete',
                    {
                        collectionName: instance.collection_name,
                        filter: `${instance.primary_key_field} == "${recordId}"`
                    }
                );

                await zillizApiCall(
                    instance.zilliz_endpoint,
                    instance.zilliz_token,
                    '/v2/vectordb/entities/insert',
                    {
                        collectionName: instance.collection_name,
                        data: [updatedRecord]
                    }
                );

                successCount++;
                await addLog(`Record ${recordId}: ✓ Complete`);

            } catch (error) {
                failCount++;
                await addLog(`Record ${recordId}: ✗ Failed - ${error.message}`, 'ERROR');
            }
        }

        // Update job progress
        const newOffset = job.current_batch_offset + records.length;
        const newProcessed = job.processed_records + successCount;
        const newFailed = job.failed_records + failCount;

        await db.update(jobs).set({
            current_batch_offset: newOffset,
            processed_records: newProcessed,
            failed_records: newFailed,
            last_batch_at: new Date(),
            updated_date: new Date()
        }).where(eq(jobs.id, job_id));

        await addLog(`Batch complete: ${successCount} succeeded, ${failCount} failed`);

        // Trigger next batch
        base44.asServiceRole.functions.invoke('processJobBatch', { job_id }, { noWait: true })
            .catch(err => console.error('Failed to trigger next batch:', err));

        return Response.json({ message: 'Batch processed successfully' });

    } catch (error) {
        console.error('Job processing error:', error);
        
        try {
            const { job_id } = await req.json();
            await db.update(jobs).set({
                status: 'failed',
                details: error.message,
                updated_date: new Date()
            }).where(eq(jobs.id, job_id));

            await db.insert(jobLogs).values({
                id: generateId(),
                job_id,
                level: 'ERROR',
                message: `Fatal error: ${error.message}`,
                created_date: new Date()
            });
        } catch (e) {
            console.error('Failed to update job status:', e);
        }

        return Response.json({ error: error.message }, { status: 500 });
    }
});