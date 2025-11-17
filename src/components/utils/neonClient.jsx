// Frontend API client for NeonDB-backed endpoints

const API_BASE = '';

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            ...options,
            credentials: 'include', // Important: include cookies for auth
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        // Try to parse as JSON regardless of content-type
        let data;
        const text = await response.text();
        
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', text);
            throw new Error(`Server returned invalid response: ${text.substring(0, 200)}`);
        }
        
        if (!response.ok) {
            const errorMsg = data.error || data.details || data.message || 'API request failed';
            const fullError = data.details ? `${data.error}: ${data.details}` : errorMsg;
            throw new Error(fullError);
        }
        
        return data;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Instance API
export const instancesApi = {
    list: async () => {
        const { data } = await apiCall(`${API_BASE}/api/functions/instancesList`);
        return data;
    },
    
    get: async (id) => {
        const { data } = await apiCall(`${API_BASE}/api/functions/instancesGet`, {
            method: 'POST',
            body: JSON.stringify({ id }),
        });
        return data;
    },
    
    create: async (instanceData) => {
        const { data } = await apiCall(`${API_BASE}/api/functions/instancesCreate`, {
            method: 'POST',
            body: JSON.stringify(instanceData),
        });
        return data;
    },
    
    update: async (id, instanceData) => {
        const { data } = await apiCall(`${API_BASE}/api/functions/instancesUpdate`, {
            method: 'POST',
            body: JSON.stringify({ id, data: instanceData }),
        });
        return data;
    },
    
    delete: async (id) => {
        await apiCall(`${API_BASE}/api/functions/instancesDelete`, {
            method: 'POST',
            body: JSON.stringify({ id }),
        });
    },
};

// Jobs API
export const jobsApi = {
    list: async (limit = 20) => {
        const { data } = await apiCall(`${API_BASE}/api/functions/jobsList?limit=${limit}`);
        return data;
    },
    
    get: async (id) => {
        const { data } = await apiCall(`${API_BASE}/api/functions/jobsGet`, {
            method: 'POST',
            body: JSON.stringify({ id }),
        });
        return data;
    },
    
    logs: async (job_id) => {
        const { data } = await apiCall(`${API_BASE}/api/functions/jobsLogs`, {
            method: 'POST',
            body: JSON.stringify({ job_id }),
        });
        return data;
    },
};

// Migration
export const migrationApi = {
    run: async () => {
        return await apiCall(`${API_BASE}/api/functions/dbMigrate`, {
            method: 'POST',
        });
    },
};