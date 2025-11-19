import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, AlertTriangle, FileText } from 'lucide-react';

export default function ContentAnalysisDialog({ open, onOpenChange, results, error, isLoading }) {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="mx-auto w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Analyzing Content...</h3>
            <p className="text-slate-600 mt-2">Fetching and analyzing all records...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center bg-red-50 p-6 rounded-lg">
          <div className="text-center">
            <AlertTriangle className="mx-auto w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-red-900">An Error Occurred</h3>
            <p className="text-red-700 mt-2 bg-red-100 p-3 rounded-md">{error}</p>
          </div>
        </div>
      );
    }

    if (!results || !results.stats) {
      return (
        <div className="flex-1 flex items-center justify-center bg-yellow-50 p-6 rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-bold text-yellow-900">No Results</h3>
            <p className="text-yellow-700 mt-2">No records were analyzed.</p>
          </div>
        </div>
      );
    }

    const { stats, records } = results;

    return (
      <div className="flex-1 overflow-hidden flex flex-col space-y-4">
        {/* Statistics Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Content Statistics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/70 p-3 rounded-lg">
              <div className="text-xs text-slate-600 mb-1">Total Records</div>
              <div className="text-2xl font-bold text-slate-900">{stats.total_records.toLocaleString()}</div>
            </div>
            <div className="bg-white/70 p-3 rounded-lg">
              <div className="text-xs text-slate-600 mb-1">Average Size</div>
              <div className="text-2xl font-bold text-slate-900">{stats.avg_size.toLocaleString()}</div>
              <div className="text-xs text-slate-500">characters</div>
            </div>
            <div className="bg-white/70 p-3 rounded-lg">
              <div className="text-xs text-slate-600 mb-1">Max Size</div>
              <div className="text-2xl font-bold text-slate-900">{stats.max_size.toLocaleString()}</div>
              <div className="text-xs text-slate-500">characters</div>
            </div>
            <div className="bg-white/70 p-3 rounded-lg">
              <div className="text-xs text-slate-600 mb-1">Min Size</div>
              <div className="text-2xl font-bold text-slate-900">{stats.min_size.toLocaleString()}</div>
              <div className="text-xs text-slate-500">characters</div>
            </div>
          </div>

          {/* Truncation Warning */}
          {stats.records_would_truncate > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-amber-900 text-sm">Content Truncation Warning</div>
                <div className="text-sm text-amber-800 mt-1">
                  <strong>{stats.records_would_truncate}</strong> record(s) ({Math.round((stats.records_would_truncate / stats.total_records) * 100)}%)
                  will be truncated from their original size to <strong>{stats.current_max_length.toLocaleString()}</strong> characters during processing.
                </div>
                <div className="text-xs text-amber-700 mt-2">
                  Current MAX_CONTENT_LENGTH: {stats.current_max_length.toLocaleString()} characters
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Records Table */}
        <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-0">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Records by Size (Largest First)</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 z-10">
                <TableRow>
                  <TableHead className="w-[200px]">Record ID</TableHead>
                  <TableHead className="text-right">Total Size</TableHead>
                  <TableHead className="text-right">Extracted Size</TableHead>
                  <TableHead className="text-right">After Truncation</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-xs">{record.id}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {record.total_size.toLocaleString()}
                      {record.has_tags && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Tagged
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {record.extracted_size.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {record.truncated_size.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {record.would_truncate ? (
                        <Badge variant="destructive" className="text-xs">
                          Will Truncate ({Math.round((1 - record.truncated_size / record.extracted_size) * 100)}% lost)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Content Size Analysis</DialogTitle>
          <DialogDescription>
            Analysis of content sizes across all records in the collection. Sorted by extracted size (largest first).
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
