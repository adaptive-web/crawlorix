import React, { useState, useEffect } from "react";
import { instancesApi } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Plus, LogIn } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

// TODO: Migrate these functions to Express API endpoints
// import { startZillizInstanceJob, executeZillizInstance } from "@/functions-stub";
import { useToast } from "@/components/ui/use-toast";

import StatsOverview from "../components/dashboard/StatsOverview";
import InstanceCard from "../components/dashboard/InstanceCard";
import CreateInstanceDialog from "../components/dashboard/CreateInstanceDialog";
import DryRunResultDialog from "../components/dashboard/DryRunResultDialog";
import ContentAnalysisDialog from "../components/dashboard/ContentAnalysisDialog";


export default function Dashboard() {
  const [instances, setInstances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingInstance, setEditingInstance] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null: checking, true: authenticated, false: not authenticated
  
  const [isDryRunLoading, setIsDryRunLoading] = useState(false);
  const [dryRunResults, setDryRunResults] = useState(null);
  const [dryRunError, setDryRunError] = useState(null);
  const [isDryRunOpen, setIsDryRunOpen] = useState(false);

  const [isContentAnalysisLoading, setIsContentAnalysisLoading] = useState(false);
  const [contentAnalysisResults, setContentAnalysisResults] = useState(null);
  const [contentAnalysisError, setContentAnalysisError] = useState(null);
  const [isContentAnalysisOpen, setIsContentAnalysisOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true); // Indicate loading while checking auth
    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        await loadData(); // Load data only if authenticated
      } else {
        setInstances([]); // Clear instances if not authenticated
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      setInstances([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('Loading instances from NeonDB...');
      const instancesData = await instancesApi.list();
      console.log('Instances loaded:', instancesData);
      setInstances(instancesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      if (error.message.includes("logged in") || error.message.includes("Unauthorized")) {
        setIsAuthenticated(false);
        setInstances([]);
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setInstances([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-600 mb-6">Please log in to access the dashboard and manage your database instances.</p>
          <Button 
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Log In
          </Button>
        </div>
      </div>
    );
  }

  // If isAuthenticated is null (checking) or true, render the main dashboard.
  // The existing isLoading state will cover the initial auth check UI (skeletons) and data loading.
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Database Instances</h1>
            <p className="text-slate-600 text-lg">Manage your Zilliz AI data pipelines</p>
          </div>
          <Button 
            onClick={handleCreateInstance}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Instance
          </Button>
        </div>

        <StatsOverview instances={instances} isLoading={isLoading} />

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Your Instances</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/50 rounded-2xl p-6 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-16 bg-white/30 backdrop-blur-sm rounded-2xl border border-slate-200/50">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Plus className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No instances yet</h3>
              <p className="text-slate-600 mb-6">Create your first database instance to get started with AI data processing</p>
              <Button 
                onClick={handleCreateInstance}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Instance
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {instances.map((instance) => (
                  <InstanceCard
                    key={instance.id}
                    instance={instance}
                    onToggleStatus={() => handleToggleStatus(instance)}
                    onExecute={(isDryRun) => handleExecute(instance, isDryRun)}
                    onEdit={() => handleEditInstance(instance)}
                    onDelete={() => handleDeleteInstance(instance)}
                    isDryRunLoading={isDryRunLoading}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <CreateInstanceDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSave={handleSaveInstance}
          initialData={editingInstance}
        />
        <DryRunResultDialog
          open={isDryRunOpen}
          onOpenChange={setIsDryRunOpen}
          results={dryRunResults}
          error={dryRunError}
          isLoading={isDryRunLoading}
        />
        <ContentAnalysisDialog
          open={isContentAnalysisOpen}
          onOpenChange={setIsContentAnalysisOpen}
          results={contentAnalysisResults}
          error={contentAnalysisError}
          isLoading={isContentAnalysisLoading}
        />
      </div>
    </div>
  );

  function handleCreateInstance() {
    setEditingInstance(null);
    setShowCreateDialog(true);
  }

  function handleEditInstance(instance) {
    setEditingInstance(instance);
    setShowCreateDialog(true);
  }

  async function handleSaveInstance(instanceData) {
    try {
      if (editingInstance) {
        await instancesApi.update(editingInstance.id, instanceData);
      } else {
        await instancesApi.create(instanceData);
      }
      setShowCreateDialog(false);
      setEditingInstance(null);
      loadData();
      toast({
        title: "Success",
        description: editingInstance ? "Instance updated" : "Instance created",
      });
    } catch (error) {
      console.error("Error saving instance:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleToggleStatus(instance) {
    try {
      const newStatus = instance.status === 'active' ? 'paused' : 'active';
      await instancesApi.update(instance.id, { status: newStatus });
      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleExecute(instance, executionType) {
    if (executionType === 'dry-run') {
      // Dry run
      setIsDryRunLoading(true);
      setDryRunResults(null);
      setDryRunError(null);
      setIsDryRunOpen(true);

      try {
        const response = await fetch(`${window.location.origin}/api/augmentor/dry-run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('base44_access_token') || 'placeholder-token'}`
          },
          body: JSON.stringify({ instance_id: instance.id })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Dry run failed');
        }

        const result = await response.json();
        setDryRunResults(result);
        toast({
          title: "Dry Run Complete",
          description: "Review the before/after comparison below.",
        });
      } catch (error) {
        console.error('Dry run error:', error);
        setDryRunError(error.message);
        toast({
          title: "Dry Run Failed",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsDryRunLoading(false);
      }
    } else if (executionType === 'content-analysis') {
      // Content Analysis
      setIsContentAnalysisLoading(true);
      setContentAnalysisResults(null);
      setContentAnalysisError(null);
      setIsContentAnalysisOpen(true);

      try {
        const response = await fetch(`${window.location.origin}/api/augmentor/content-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('base44_access_token') || 'placeholder-token'}`
          },
          body: JSON.stringify({ instance_id: instance.id })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Content analysis failed');
        }

        const result = await response.json();
        setContentAnalysisResults(result);
        toast({
          title: "Content Analysis Complete",
          description: `Analyzed ${result.stats.total_records} records.`,
        });
      } catch (error) {
        console.error('Content analysis error:', error);
        setContentAnalysisError(error.message);
        toast({
          title: "Content Analysis Failed",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsContentAnalysisLoading(false);
      }
    } else {
      // Start full job
      try {
        const response = await fetch(`${window.location.origin}/api/augmentor/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('base44_access_token') || 'placeholder-token'}`
          },
          body: JSON.stringify({ instance_id: instance.id })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start job');
        }

        const result = await response.json();
        toast({
          title: "Job Started",
          description: `Job ${result.job_id} is now running. Check the Jobs page for progress.`,
        });
        loadData();
      } catch (error) {
        console.error('Start job error:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  }

  async function handleDeleteInstance(instance) {
    if (window.confirm(`Are you sure you want to delete "${instance.name}"?`)) {
      try {
        await instancesApi.delete(instance.id);
        loadData();
        toast({
          title: "Success",
          description: "Instance deleted",
        });
      } catch (error) {
        console.error("Error deleting instance:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  }
}