import React, { useState } from 'react';
import { dbMigrate } from '@/functions/dbMigrate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Database, AlertTriangle, Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

export default function MigrationSetup() {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState(null);
    const { toast } = useToast();

    const correctUrl = "postgresql://neondb_owner:npg_mHiYOGgBX0F1@ep-fragrant-bush-ab188gf6-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";

    const copyToClipboard = () => {
        navigator.clipboard.writeText(correctUrl);
        toast({
            title: "Copied!",
            description: "Connection string copied to clipboard",
        });
    };

    const runMigration = async () => {
        setIsRunning(true);
        setResult(null);
        setError(null);
        setDebugInfo(null);

        try {
            const { data, error: fnError } = await dbMigrate({});
            
            console.log('Full response:', { data, error: fnError });
            setDebugInfo(JSON.stringify({ data, error: fnError }, null, 2));
            
            if (fnError) {
                throw new Error(fnError.message || 'Migration failed');
            }
            
            if (data.error) {
                throw new Error(`${data.error}${data.details ? '\n\n' + data.details : ''}`);
            }
            
            setResult(data);
        } catch (err) {
            console.error('Migration error:', err);
            setError(err.message || 'Failed to run migration');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Database Setup</h1>
                    <p className="text-slate-600 text-lg">Initialize your NeonDB tables</p>
                </div>

                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>DATABASE_URL is incorrectly formatted!</strong>
                        <p className="mt-2">Your DATABASE_URL contains <code className="bg-red-100 px-1 rounded">psql</code> command prefix.</p>
                        <p className="mt-2">Go to Base44 Dashboard → Settings → Environment Variables and update DATABASE_URL to:</p>
                        <div className="mt-3 bg-slate-900 text-slate-100 p-3 rounded text-xs font-mono break-all flex items-start justify-between gap-2">
                            <span className="flex-1">{correctUrl}</span>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={copyToClipboard}
                                className="text-slate-100 hover:text-white hover:bg-slate-800 h-6 px-2"
                            >
                                <Copy className="w-3 h-3" />
                            </Button>
                        </div>
                        <p className="mt-2 text-sm">Remove the <code className="bg-red-100 px-1 rounded">psql '</code> at the beginning and the closing <code className="bg-red-100 px-1 rounded">'</code></p>
                    </AlertDescription>
                </Alert>

                <Alert className="bg-blue-50 border-blue-200">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                        <strong>Requirements:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>You must be logged in as an <strong>admin</strong> user</li>
                            <li>DATABASE_URL must be configured correctly (see alert above)</li>
                        </ul>
                    </AlertDescription>
                </Alert>

                <Card className="bg-white/70 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-6 h-6 text-blue-600" />
                            Create Database Tables
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-slate-600">
                            This will create the necessary tables in your NeonDB database:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-slate-700">
                            <li><code className="bg-slate-100 px-2 py-1 rounded">database_instances</code></li>
                            <li><code className="bg-slate-100 px-2 py-1 rounded">jobs</code></li>
                            <li><code className="bg-slate-100 px-2 py-1 rounded">job_logs</code></li>
                        </ul>

                        <Button 
                            onClick={runMigration} 
                            disabled={isRunning}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Creating Tables...
                                </>
                            ) : (
                                <>
                                    <Database className="w-5 h-5 mr-2" />
                                    Run Migration
                                </>
                            )}
                        </Button>

                        {result && result.success && (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    <strong>Success!</strong> {result.message}
                                </AlertDescription>
                            </Alert>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <XCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Error:</strong> 
                                    <pre className="mt-2 text-xs whitespace-pre-wrap">{error}</pre>
                                </AlertDescription>
                            </Alert>
                        )}

                        {debugInfo && (
                            <details className="bg-slate-900 text-slate-100 p-4 rounded text-xs">
                                <summary className="cursor-pointer font-semibold mb-2">Debug Info</summary>
                                <pre className="overflow-auto">{debugInfo}</pre>
                            </details>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}