import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface AIAssistantPanelProps {
  noteId: string;
  currentContent: any;
  onApply: (content: any, mode: 'replace' | 'append') => void;
}

export function AIAssistantPanel({ noteId, currentContent, onApply }: AIAssistantPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [detectedCommands, setDetectedCommands] = useState<string[]>([]);

  // Detect bracket commands in content
  const detectBracketCommands = (content: any): string[] => {
    if (!content?.content) return [];
    
    const commands: string[] = [];
    const commandMap: { [key: string]: string } = {
      'expand': 'expand',
      'simplify': 'simplify',
      'shorten': 'simplify',
      'professional': 'professional tone',
      'professional tone': 'professional tone',
      'formal': 'professional tone',
      'polish': 'polish',
      'improve': 'improve',
      'elaborate': 'expand',
      'concise': 'simplify',
    };
    
    const processNode = (node: any) => {
      if (node.type === 'text' && node.text) {
        const matches = node.text.match(/\[([^\]]+)\]/gi);
        if (matches) {
          matches.forEach((match: string) => {
            const command = match.slice(1, -1).toLowerCase().trim();
            const mappedCommand = commandMap[command];
            if (mappedCommand && !commands.includes(mappedCommand)) {
              commands.push(mappedCommand);
            }
          });
        }
      }
      if (node.content) {
        node.content.forEach(processNode);
      }
    };
    
    content.content.forEach(processNode);
    return commands;
  };

  const analyzeNote = useCallback(async (userPrompt?: string) => {
    setIsAnalyzing(true);
    const toastId = toast.loading('Analyzing your note...');

    try {
      // Use functional update to avoid chatHistory dependency
      const currentHistory = userPrompt
        ? await new Promise<Array<{ role: 'user' | 'assistant'; content: string }>>((resolve) => {
            setChatHistory(prev => {
              const updated = [...prev, { role: 'user' as const, content: userPrompt }];
              resolve(updated);
              return updated;
            });
          })
        : [];

      const { data, error } = await supabase.functions.invoke('notes-ai', {
        body: {
          noteId,
          action: 'analyze-and-suggest',
          currentContent,
          chatHistory: currentHistory,
        },
      });

      if (error) {
        if (error.message.includes('Premium feature')) {
          toast.error('Upgrade to unlock AI Assistant', { id: toastId });
          return;
        }
        if (error.message.includes('Daily AI limit')) {
          toast.error('Daily AI limit reached. Upgrade for more!', { id: toastId });
          return;
        }
        throw error;
      }

      if (data?.content) {
        setSuggestion(data.content);
        if (userPrompt) {
          setChatHistory(prev => [
            ...prev,
            { role: 'assistant', content: 'Updated suggestion based on your feedback' },
          ]);
        }
        toast.success('AI suggestion ready!', { id: toastId });
      }
    } catch (error: any) {
      console.error('AI analysis error:', error);
      toast.error(error.message || 'Failed to analyze note', { id: toastId });
    } finally {
      setIsAnalyzing(false);
    }
  }, [noteId, currentContent]);

  // Auto-analyze on mount
  useEffect(() => {
    const commands = detectBracketCommands(currentContent);
    setDetectedCommands(commands);
    analyzeNote();
  }, [currentContent, analyzeNote]);

  const handleQuickPrompt = (prompt: string) => {
    analyzeNote(prompt);
  };

  const extractTextPreview = (content: any): string => {
    if (!content?.content) return '';
    return content.content
      .map((node: any) => {
        if (node.type === 'paragraph' && node.content) {
          return node.content.map((c: any) => c.text || '').join('');
        }
        if (node.type === 'heading' && node.content) {
          return node.content.map((c: any) => c.text || '').join('');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .substring(0, 500);
  };

  return (
    <div className="space-y-4 px-4 pb-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">AI Assistant</h3>
        </div>
      </div>

      {/* Detected Commands */}
      {detectedCommands.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-primary/5 rounded-md border border-primary/10">
          <span className="text-xs text-muted-foreground">Detected commands:</span>
          {detectedCommands.map((cmd) => (
            <span key={cmd} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
              [{cmd}]
            </span>
          ))}
        </div>
      )}

      {isAnalyzing ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing your note...</p>
        </div>
      ) : suggestion ? (
        <>
          {/* Suggestion Preview */}
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">AI Suggestion:</div>
            <ScrollArea className="h-64 w-full rounded-md border bg-muted/20 p-3">
              <div className="prose prose-sm max-w-none text-sm">
                {extractTextPreview(suggestion)}
              </div>
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => onApply(suggestion, 'replace')}
              className="w-full"
              size="sm"
            >
              <Check className="h-4 w-4 mr-2" />
              Replace Note
            </Button>
            <Button
              onClick={() => onApply(suggestion, 'append')}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Append to Note
            </Button>
          </div>

          <Separator />

          {/* Quick Refinement Prompts */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Refine it:</div>
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleQuickPrompt('Make it shorter and more concise')}
              >
                Make it shorter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleQuickPrompt('Make it more professional')}
              >
                More professional
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleQuickPrompt('Expand with more details')}
              >
                Add more detail
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No suggestion available
        </div>
      )}
    </div>
  );
}
