
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
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function DryRunResultDialog({ open, onOpenChange, results, error, isLoading }) {
  const hasEmbedding = results?.after?.embedding_dimensions > 0;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="mx-auto w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Running Dry Run...</h3>
            <p className="text-slate-600 mt-2">Processing a sample record with AI...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center bg-red-50 p-6 rounded-lg">
          <div className="text-center">
            <XCircle className="mx-auto w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-red-900">An Error Occurred</h3>
            <p className="text-red-700 mt-2 bg-red-100 p-3 rounded-md">{error}</p>
          </div>
        </div>
      );
    }

    if (!results || !results.before) {
      return (
        <div className="flex-1 flex items-center justify-center bg-yellow-50 p-6 rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-bold text-yellow-900">No Results</h3>
            <p className="text-yellow-700 mt-2">No records were processed.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Metadata */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Processing Info</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Record ID:</span>
              <span className="ml-2 font-mono text-blue-900">{results.before.record_id}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Model:</span>
              <span className="ml-2 font-mono text-blue-900">{results.metadata?.model}</span>
            </div>
            {hasEmbedding && (
              <div>
                <span className="text-blue-700 font-medium">Embedding:</span>
                <span className="ml-2 font-mono text-blue-900">{results.metadata?.embedding_model}</span>
              </div>
            )}
            {hasEmbedding && (
              <div>
                <span className="text-blue-700 font-medium">Vector Dimensions:</span>
                <span className="ml-2 font-mono text-blue-900">{results.after.embedding_dimensions}</span>
              </div>
            )}
          </div>
        </div>

        {/* Three-Stage Comparison: Original → Pass 1 → Final */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Original */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">1. Original</h3>
              <p className="text-xs text-slate-600 mt-1">
                {results.original?.length || results.before.content.length} chars
              </p>
            </div>
            <div className="p-4 bg-white max-h-96 overflow-y-auto">
              <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                {results.original?.content || results.before.content}
              </p>
            </div>
          </div>

          {/* 2. After Pass 1 (Programmatic) */}
          <div className="border border-blue-200 rounded-lg overflow-hidden">
            <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
              <h3 className="font-semibold text-blue-900">2. After Pass 1 (Programmatic)</h3>
              <p className="text-xs text-blue-700 mt-1">
                {results.pass1?.stats?.chars_after_filtering || 'N/A'} chars
                {results.pass1?.stats?.sentences_removed > 0 && (
                  <span className="ml-2">
                    • {results.pass1.stats.sentences_removed} sentences removed
                  </span>
                )}
              </p>
            </div>
            <div className="p-4 bg-white max-h-96 overflow-y-auto">
              <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                {results.pass1?.cleaned_content || results.before.content}
              </p>
            </div>
            {results.pass1?.stats && (
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 text-xs">
                <div className="flex gap-4 text-blue-700">
                  {Object.entries(results.pass1.stats.language_counts || {}).map(([lang, count]) => (
                    <span key={lang}>
                      <strong>{lang}:</strong> {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Final (After AI) */}
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 px-4 py-2 border-b border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-900">3. Final (After AI)</h3>
                  <p className="text-xs text-green-700 mt-1">
                    {results.final?.length || results.after.content.length} chars
                    {results.pass2?.skipped && (
                      <span className="ml-2">• AI Skipped</span>
                    )}
                  </p>
                </div>
                {hasEmbedding && (
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-100">
                    <CheckCircle className="w-4 h-4 mr-1"/>
                    Vector
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-4 bg-white max-h-96 overflow-y-auto">
              <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                {results.after.content}
              </p>
            </div>
            {results.final?.processing_path && (
              <div className="px-4 py-2 bg-green-50 border-t border-green-200 text-xs text-green-700">
                <strong>Path:</strong> {results.final.processing_path}
              </div>
            )}
          </div>
        </div>

        {/* Prompt Used */}
        {results.metadata?.prompt_used && (
          <details className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 text-sm">
              View Prompt Used
            </summary>
            <p className="mt-2 text-xs text-slate-600 whitespace-pre-wrap font-mono">
              {results.metadata.prompt_used}
            </p>
          </details>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Dry Run Results</DialogTitle>
          <DialogDescription>
            This is a preview of what would happen. No data has been changed in Zilliz.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
