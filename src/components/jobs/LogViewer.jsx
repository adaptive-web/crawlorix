
import { useState, useEffect } from 'react';
import { jobsApi } from '@/api/client';
import { Info, AlertCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function LogViewer({ jobId }) {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            try {
                const logsData = await jobsApi.logs(jobId);
                setLogs(logsData);
            } catch (error) {
                console.error('Failed to load logs:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadLogs();
        const interval = setInterval(loadLogs, 5000);
        return () => clearInterval(interval);
    }, [jobId]);

    const getIcon = (level) => {
        return level === 'ERROR' ? 
            <AlertCircle className="w-4 h-4 text-red-500" /> : 
            <Info className="w-4 h-4 text-blue-500" />;
    };

    if (isLoading) {
        return (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-slate-600">Loading logs...</span>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 text-center">No logs yet</p>
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-slate-700 mb-2">Live Logs</h4>
            {logs.map((log) => (
                <div 
                    key={log.id} 
                    className={`flex gap-2 text-xs p-2 rounded ${log.level === 'ERROR' ? 'bg-red-50' : 'bg-white'}`}
                >
                    {getIcon(log.level)}
                    <div className="flex-1">
                        <span className="text-slate-500 font-mono">
                            {format(parseISO(log.created_date), 'MMM dd, HH:mm:ss')}
                        </span>
                        <span className="ml-2 text-slate-700">{log.message}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
