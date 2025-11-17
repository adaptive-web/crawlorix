
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
  const hasEmbeddingUpdate = results?.some(r => r.embedding_would_be_updated);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="mx-auto w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Running Dry Run...</h3>
            <p className="text-slate-600 mt-2">Fetching and processing a sample of records.</p>
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

    if (!results || results.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center bg-yellow-50 p-6 rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-bold text-yellow-900">No Matching Records Found</h3>
            <p className="text-yellow-700 mt-2">The query filter did not return any records to process.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white">
            <TableRow>
              <TableHead>Record ID</TableHead>
              <TableHead>Extracted Content</TableHead>
              <TableHead>AI Processed</TableHead>
              <TableHead>Full Field Value</TableHead>
              {hasEmbeddingUpdate && <TableHead className="text-center">Embedding Update</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.record_id}>
                <TableCell className="align-top text-xs font-mono text-blue-600 font-semibold">
                  {result.record_id}
                </TableCell>
                <TableCell className="align-top text-xs text-slate-600 max-w-sm">
                  <p className="font-mono break-words">{result.original_extracted}</p>
                </TableCell>
                <TableCell className="align-top text-xs max-w-sm">
                   <p className={`font-mono break-words ${result.ai_processed.startsWith('(AI Error') ? 'text-red-600' : 'text-slate-900'}`}>{result.ai_processed}</p>
                </TableCell>
                <TableCell className="align-top text-xs text-slate-600 max-w-sm">
                  <p className="font-mono break-words bg-yellow-50 p-2 rounded border">{result.full_field_value}</p>
                </TableCell>
                {hasEmbeddingUpdate && (
                  <TableCell className="text-center align-top">
                    {result.embedding_would_be_updated ? (
                      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                        <CheckCircle className="w-4 h-4 mr-2"/>
                        Yes
                      </Badge>
                    ) : (
                       <Badge variant="outline">
                        No
                      </Badge>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
