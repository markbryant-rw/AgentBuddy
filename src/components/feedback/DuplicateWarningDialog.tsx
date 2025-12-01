import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";

interface Duplicate {
  bug_id: string;
  confidence: number;
  reason: string;
  summary?: string;
  status?: string;
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: Duplicate[];
  onSubmitAnyway: () => void;
  onViewDuplicate: (bugId: string) => void;
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  duplicates,
  onSubmitAnyway,
  onViewDuplicate,
}: DuplicateWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl z-[11001]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>Potential Duplicate Bugs Found</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            We found {duplicates.length} similar bug report{duplicates.length > 1 ? 's' : ''}. Please review before submitting.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {duplicates.map((dup, idx) => (
              <div
                key={dup.bug_id}
                className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onViewDuplicate(dup.bug_id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">Duplicate #{idx + 1}</h4>
                  <Badge variant={dup.confidence > 80 ? "destructive" : "secondary"}>
                    {dup.confidence}% match
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{dup.reason}</p>
                {dup.summary && (
                  <p className="text-sm font-medium">"{dup.summary}"</p>
                )}
                {dup.status && (
                  <Badge variant="outline" className="mt-2">
                    Status: {dup.status}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onSubmitAnyway} className="bg-primary">
            Submit Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
