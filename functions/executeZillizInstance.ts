import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai@4.28.0';
import { getDb } from './db/client.js';
import { databaseInstances } from './db/schema.js';
import { eq } from 'npm:drizzle-orm@0.29.3';

// Timeout utility
function withTimeout(promise, timeoutMs) {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

// Zilliz API helper
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
    }).finally(() => clearTimeout(timeoutId))
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Zilliz error: ${errorText}`);
        }
        let text = await response.text();
        text = text.replace(/"id":\s*(\d{15,})/g, '"id":"$1"');
        return JSON.parse(text);
    });
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

        // Get instance
        const [instance] = await db.select().from(databaseInstances).where(eq(databaseInstances.id, instance_id));
        
        if (!instance) {
            return Response.json({ error: 'Instance not found' }, { status: 404 });
        }

        console.log('Starting dry run for instance:', instance.name);

        // Fetch 3 sample records
        const queryResponse = await zillizApiCall(
            instance.zilliz_endpoint,
            instance.zilliz_token,
            '/v2/vectordb/entities/query',
            {
                collectionName: instance.collection_name,
                filter: instance.query_filter || '',
                limit: 3,
                outputFields: ['*']
            }
        );

        const records = queryResponse.data || [];
        console.log(`Fetched ${records.length} sample records`);

        if (records.length === 0) {
            return Response.json({ 
                data: { 
                    sample_results: [],
                    message: 'No records found matching the query filter'
                }
            });
        }

        // Initialize OpenAI
        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

        const results = [];

        for (const record of records) {
            try {
                let content = record[instance.target_field] || '';
                
                // Extract content from [pagecontent] tags if present
                const tagRegex = /\[pagecontent\](.*?)\[\/pagecontent\]/gs;
                const match = tagRegex.exec(content);
                const extractedContent = match ? match[1] : content;

                // Truncate if needed
                const truncatedContent = extractedContent.length > 12000 
                    ? extractedContent.substring(0, 12000) 
                    : extractedContent;

                // Process with AI
                const promptWithContent = instance.prompt.replace(/\{\{FIELD_VALUE\}\}/g, truncatedContent);
                
                const aiResponse = await withTimeout(
                    openai.chat.completions.create({
                        model: instance.generative_model_name,
                        messages: [
                            { role: 'system', content: 'You are a helpful assistant for data processing.' },
                            { role: 'user', content: promptWithContent }
                        ],
                        temperature: 0.3,
                    }),
                    60000
                );

                const processedContent = aiResponse.choices[0].message.content;

                // Check if embedding will be generated
                let willGenerateEmbedding = false;
                if (instance.vector_field_name) {
                    willGenerateEmbedding = true;
                }

                results.push({
                    record_id: record[instance.primary_key_field],
                    original_content: truncatedContent.substring(0, 200) + (truncatedContent.length > 200 ? '...' : ''),
                    processed_content: processedContent.substring(0, 200) + (processedContent.length > 200 ? '...' : ''),
                    full_field_value: content,
                    ai_status: 'success',
                    will_update_embedding: willGenerateEmbedding
                });

            } catch (error) {
                results.push({
                    record_id: record[instance.primary_key_field],
                    original_content: 'Error processing',
                    processed_content: null,
                    ai_status: 'error',
                    error: error.message
                });
            }
        }

        return Response.json({ data: { sample_results: results } });

    } catch (error) {
        console.error('Dry run error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});