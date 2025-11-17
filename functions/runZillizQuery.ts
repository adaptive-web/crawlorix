import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai@4.28.0';
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

        const { instance_id, search_term } = await req.json();

        if (!instance_id || !search_term) {
            return Response.json({ error: 'Missing instance_id or search_term' }, { status: 400 });
        }

        const db = getDb();

        // Get instance
        const [instance] = await db.select().from(databaseInstances).where(eq(databaseInstances.id, instance_id));
        
        if (!instance) {
            return Response.json({ error: 'Instance not found' }, { status: 404 });
        }

        if (instance.instance_type !== 'query') {
            return Response.json({ error: 'Instance is not a query type' }, { status: 400 });
        }

        console.log(`Query instance: ${instance.name}, search: "${search_term}"`);

        // Initialize OpenAI
        const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

        // Generate embedding for search term
        const embeddingResponse = await openai.embeddings.create({
            model: instance.embedding_model_name,
            input: search_term
        });

        const searchVector = embeddingResponse.data[0].embedding;

        // Query Zilliz
        const zillizUrl = `${instance.zilliz_endpoint}/v2/vectordb/entities/search`;
        const queryPayload = {
            collectionName: instance.collection_name,
            vector: searchVector,
            limit: instance.top_k || 5,
            outputFields: ['*']
        };

        console.log(`Querying Zilliz: ${zillizUrl}`);

        const zillizResponse = await fetch(zillizUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${instance.zilliz_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(queryPayload)
        });

        if (!zillizResponse.ok) {
            const errorText = await zillizResponse.text();
            console.error('Zilliz error:', errorText);
            return Response.json({ 
                error: `Zilliz API error: ${errorText}` 
            }, { status: 500 });
        }

        let responseText = await zillizResponse.text();
        // Handle large IDs
        responseText = responseText.replace(/"id":\s*(\d{15,})/g, '"id":"$1"');
        const zillizData = JSON.parse(responseText);

        const results = zillizData.data || [];

        console.log(`Found ${results.length} results`);

        return Response.json({ 
            data: {
                results,
                debug_info: {
                    zilliz_url: zillizUrl,
                    zilliz_query: queryPayload,
                    embedding_vector_length: searchVector.length,
                    zilliz_response_code: zillizResponse.status
                }
            }
        });

    } catch (error) {
        console.error('Query error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});