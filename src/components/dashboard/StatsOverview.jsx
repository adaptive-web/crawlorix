
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsOverview({ instances, isLoading }) {
  const activeInstances = instances.filter(i => i.status === 'active').length;
  // totalProcessed, recentLogs, and successRate are removed as logs are no longer passed
  // The original prompt implies removing stats related to logs, so only instance-related stats remain.
  // The 'logs' prop has been removed from the component signature.

  const stats = [
    {
      title: "Active Instances",
      value: activeInstances,
      total: instances.length,
      icon: Database,
      color: "blue"
    },
    // Other stats such as "Records Processed", "Success Rate", and "Recent Executions"
    // are removed as they are no longer relevant without direct log access
    // and align with focusing on "Scalable Job Queue for Processing" instances.
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    // green, emerald, purple color classes are removed as they are no longer used by the remaining stats.
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white/70 backdrop-blur-sm border-slate-200/50 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {stat.title}
            </CardTitle>
            <div className={`w-10 h-10 bg-gradient-to-br ${colorClasses[stat.color]} rounded-xl flex items-center justify-center shadow-sm`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">
                {stat.value}
                {stat.total && (
                  <span className="text-slate-500 text-base font-normal ml-1">
                    / {stat.total}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
