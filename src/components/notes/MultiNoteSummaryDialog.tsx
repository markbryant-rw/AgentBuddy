import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface MultiNoteSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNoteIds: string[];
  onComplete?: () => void;
}

export function MultiNoteSummaryDialog({
  open,
  onOpenChange,
  selectedNoteIds,
  onComplete,
}: MultiNoteSummaryDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (selectedNoteIds.length < 2) {
      toast.error('Please select at least 2 notes');
      return;
    }

    setIsGenerating(true);
    setSummary('');

    try {
      // Fetch all selected notes
      const { data: notes, error: fetchError } = await supabase
        .from('notes')
        .select('title, content_plain')
        .in('id', selectedNoteIds);

      if (fetchError) throw fetchError;

      // Combine all note contents
      const combinedContent = notes
        .map((note, index) => `### Note ${index + 1}: ${note.title}\n\n${note.content_plain || '(Empty note)'}`)
        .join('\n\n---\n\n');

      // Call AI function
      const { data, error } = await supabase.functions.invoke('notes-ai', {
        body: {
          action: 'consolidate-notes',
          selectedText: combinedContent,
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('daily limit')) {
          toast.error('Daily AI limit reached', {
            description: data.error,
          });
        } else if (data.error.includes('Premium feature')) {
          toast.error('Premium feature required', {
            description: data.error,
          });
        } else {
          toast.error('AI generation failed', {
            description: data.error,
          });
        }
        return;
      }

      setSummary(data.content);
      toast.success('Summary generated successfully');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAsNote = async () => {
    if (!summary) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: newNote, error } = await supabase
        .from('notes')
        .insert([{
          owner_id: user.id,
          title: `Consolidated Summary - ${new Date().toLocaleDateString()}`,
          content_plain: summary,
          content_rich: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: summary }],
              },
            ],
          },
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Summary saved as new note');
      onOpenChange(false);
      if (onComplete) onComplete();
      navigate(`/notes/${newNote.id}`);
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Summarize Multiple Notes</DialogTitle>
          <DialogDescription>
            Generate a consolidated summary from {selectedNoteIds.length} selected notes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!summary && !isGenerating && (
            <Button onClick={handleGenerate} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Summary
            </Button>
          )}

          {isGenerating && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">
                Analyzing {selectedNoteIds.length} notes...
              </span>
            </div>
          )}

          {summary && (
            <>
              <div className="prose prose-sm max-w-none p-4 bg-muted/30 rounded-lg border">
                <pre className="whitespace-pre-wrap font-sans text-sm">{summary}</pre>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSummary('');
                    handleGenerate();
                  }}
                  disabled={isGenerating || isSaving}
                >
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
                <Button onClick={handleSaveAsNote} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save as Note
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
