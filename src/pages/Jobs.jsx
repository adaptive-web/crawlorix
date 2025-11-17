
import React, { useState, useEffect, useCallback } from "react";
import { jobsApi, instancesApi } from "@/components/utils/neonClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle, XCircle, Clock, Ban, RefreshCw, AlertTriangle, ChevronDown } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { cancelJob } from "@/functions/cancelJob";
import LogViewer from '../components/jobs/LogViewer';


export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [instances, setInstances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedJobs, setExpandedJobs] = useState(new Set());
  const { toast } = useToast();

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh || isLoading) {
        setIsLoading(true);
    }
    setError(null);
    
    try {
      const [jobsData, instancesData] = await Promise.all([
        jobsApi.list(20),
        instancesApi.list()
      ]);
      setJobs(jobsData);
      setInstances(instancesData);
    } catch (error) {
      console.error("Error loading jobs:", error);
      setError(error.message || "Failed to load jobs. Please refresh the page.");
      toast({
        title: "Error Loading Jobs",
        description: error.message || "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, toast]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 5000);
    return () => clearInterval(interval);
  }, [loadData]);
  
  const getInstanceName = (instanceId) => instances.find(i => i.id === instanceId)?.name || 'Unknown';

  const handleToggleDetails = (jobId) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleCancelJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to stop this job?")) return;
    try {
      await cancelJob({ job_id: jobId });
      toast({
        title: "Job Cancelled",
        description: "The job will stop after completing its current batch.",
      });
      loadData(true);
    } catch (error) {
      console.error("Failed to cancel job:", error);
      toast({
        title: "Error",
        description: "Could not cancel the job. " + error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed': return { color: 'green', icon: CheckCircle };
      case 'failed': return { color: 'red', icon: XCircle };
      case 'running': return { color: 'blue', icon: Activity };
      case 'pending': return { color: 'yellow', icon: Clock };
      case 'cancelled': return { color: 'gray', icon: Ban };
      default: return { color: 'gray', icon: Clock };
    }
  };

  const renderJobDetails = (job) => {
    return <LogViewer jobId={job.id} />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-slate-900">Jobs</h1>
          <Button variant="ghost" size="icon" onClick={() => loadData(true)} disabled={isLoading}>
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {isLoading && jobs.length === 0 ? (
             <p className="text-slate-500">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 bg-white/30 backdrop-blur-sm rounded-2xl border border-slate-200/50">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No jobs found</h3>
                <p className="text-slate-600">Run an instance from the Dashboard to see jobs here.</p>
            </div>
          ) : (
            jobs.map(job => {
              const { color, icon: Icon } = getStatusInfo(job.status);
              
              const hasTotal = job.total_records > 0;
              const progress = hasTotal ? ((job.processed_records + job.failed_records) / job.total_records) * 100 : 0;
              
              const isCancellable = job.status === 'running' || job.status === 'pending';
              const isExpanded = expandedJobs.has(job.id);

              return (
                <Card key={job.id} className="bg-white/70 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="pb-4 cursor-pointer hover:bg-slate-50/50" onClick={() => handleToggleDetails(job.id)}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900">{getInstanceName(job.instance_id)}</CardTitle>
                        <p className="text-sm text-slate-500">
                          Job ID: {job.id} &bull; 
                          {job.started_at ? 
                            `Started ${formatDistanceToNow(parseISO(job.started_at), { addSuffix: true })}` :
                            `Created ${formatDistanceToNow(parseISO(job.created_date), { addSuffix: true })}`
                          }
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                         <Badge variant="secondary" className="font-mono text-xs">
                          {job.execution_type === 'dry_run' ? 'Dry Run' : 'Full Execution'}
                         </Badge>
                         {isCancellable && (
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleCancelJob(job.id); }}>
                                <Ban className="w-4 h-4 mr-2"/>
                                Stop
                            </Button>
                         )}
                        <Badge variant="outline" className={`border-${color}-300 bg-${color}-50 text-${color}-800 text-sm`}>
                          <Icon className={`w-4 h-4 mr-2 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                          {job.status}
                        </Badge>
                        <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {job.execution_type === 'full_execution' && !hasTotal && (
                       <div className="mb-4 text-center p-3 bg-slate-100 rounded-lg">
                         <p className="font-medium text-slate-700">Processing records... Progress will be shown as batches complete.</p>
                       </div>
                    )}
                    {job.execution_type === 'full_execution' && hasTotal && (
                      <div className="mb-4">
                        <div className="flex justify-between mb-1 text-sm font-medium">
                          <span className="text-slate-700">Progress</span>
                          <span className={`text-${color}-600 font-semibold`}>
                            {job.processed_records + job.failed_records} / {job.total_records}
                          </span>
                        </div>
                        <Progress value={progress} className="w-full" indicatorClassName={`bg-${color}-500`} />
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-4 text-center text-xs">
                      <div className="p-2 bg-green-50 rounded-md">
                        <p className="font-bold text-lg text-green-800">{job.processed_records || 0}</p>
                        <p className="font-medium text-green-600">Completed</p>
                      </div>
                      <div className="p-2 bg-red-50 rounded-md">
                        <p className="font-bold text-lg text-red-800">{job.failed_records || 0}</p>
                        <p className="font-medium text-red-600">Failed</p>
                      </div>
                       <div className="p-2 bg-slate-100 rounded-md">
                        <p className="font-bold text-lg text-slate-800">{job.total_records || 0}</p>
                        <p className="font-medium text-slate-600">Total</p>
                      </div>
                    </div>
                    {isExpanded && renderJobDetails(job)}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
