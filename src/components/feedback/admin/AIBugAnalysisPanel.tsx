import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, ChevronDown, Copy, Target, AlertTriangle, Lightbulb, Code, HelpCircle, Wrench, Rocket, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AIBugAnalysisPanelProps {
  bugId: string;
  initialAnalysis?: any;
  isAdmin?: boolean;
}

export function AIBugAnalysisPanel({ bugId, initialAnalysis, isAdmin }: AIBugAnalysisPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-bug-report', {
        body: { bugId }
      });
      
      if (error) throw error;
      return data.analysis;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success('AI analysis complete!');
      queryClient.invalidateQueries({ queryKey: ['bug-detail', bugId] });
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      setIsOpen(true);
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });

  const [copiedFixPrompt, setCopiedFixPrompt] = useState(false);

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard!');
  };

  const copyFixPrompt = () => {
    if (analysis?.lovable_fix_prompt) {
      navigator.clipboard.writeText(analysis.lovable_fix_prompt);
      setCopiedFixPrompt(true);
      toast.success('Fix prompt copied! Paste it into Lovable to resolve the issue.');
      setTimeout(() => setCopiedFixPrompt(false), 2000);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'trivial':
      case 'easy':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'moderate':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      case 'complex':
      case 'major':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (!isAdmin) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <Card className="border-2 border-primary/20">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">AI Bug Hunt Co-Pilot</h4>
              {analysis && (
                <Badge variant="outline" className="ml-2">
                  Analyzed
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!analysis && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    analyzeMutation.mutate();
                  }}
                  disabled={analyzeMutation.isPending}
                >
                  {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze with AI'}
                </Button>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {analyzeMutation.isPending && (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {analysis && (
              <>
                {/* 🚀 Fix It Prompt - Primary Action */}
                {analysis.lovable_fix_prompt && !analysis.needs_more_info && (
                  <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Rocket className="h-5 w-5 text-primary" />
                          <h5 className="font-semibold text-primary">Fix It Prompt</h5>
                        </div>
                        <Button
                          size="sm"
                          onClick={copyFixPrompt}
                          className="gap-2"
                        >
                          {copiedFixPrompt ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy & Fix in Lovable
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="bg-background rounded-lg p-3 border">
                        <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/90 leading-relaxed">
                          {analysis.lovable_fix_prompt}
                        </pre>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Copy this prompt and paste it into Lovable to resolve the issue
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Needs More Info */}
                {analysis.needs_more_info && analysis.clarifying_questions?.length > 0 && (
                  <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h5 className="font-medium text-amber-900 dark:text-amber-100 mb-2">More Information Needed</h5>
                          <ul className="space-y-1 text-sm">
                            {analysis.clarifying_questions.map((q: string, i: number) => (
                              <li key={i} className="text-amber-800 dark:text-amber-200">• {q}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Root Cause & Confidence */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <h5 className="font-medium">Root Cause Analysis</h5>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getComplexityColor(analysis.estimated_fix_complexity)}>
                        {analysis.estimated_fix_complexity}
                      </Badge>
                      <Badge variant="outline" className={getConfidenceColor(analysis.confidence)}>
                        {Math.round(analysis.confidence * 100)}% confident
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.root_cause_hypothesis}</p>
                </div>

                {/* Impact */}
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${
                    analysis.impact === 'critical' ? 'text-red-600' :
                    analysis.impact === 'high' ? 'text-orange-600' :
                    analysis.impact === 'medium' ? 'text-amber-600' :
                    'text-blue-600'
                  }`} />
                  <span className="text-sm font-medium">Impact: </span>
                  <Badge variant={analysis.impact === 'critical' || analysis.impact === 'high' ? 'destructive' : 'secondary'}>
                    {analysis.impact}
                  </Badge>
                </div>

                {/* Areas to Investigate */}
                {analysis.areas_to_investigate?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-primary" />
                      <h5 className="font-medium text-sm">Areas to Investigate</h5>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.areas_to_investigate.map((area: string, i: number) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Prompts */}
                {analysis.suggested_prompts?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <h5 className="font-medium text-sm">Suggested Lovable Prompts</h5>
                    </div>
                    <div className="space-y-2">
                      {analysis.suggested_prompts.map((item: any, i: number) => (
                        <Card key={i} className="bg-primary/5">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-1">{item.label}</p>
                                <p className="text-xs text-muted-foreground font-mono bg-background p-2 rounded">
                                  {item.prompt}
                                </p>
                                {item.context && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">{item.context}</p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyPrompt(item.prompt)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Solution Outline */}
                {analysis.solution_outline?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-primary" />
                      <h5 className="font-medium text-sm">Solution Outline</h5>
                    </div>
                    <ol className="space-y-1 text-sm list-decimal list-inside">
                      {analysis.solution_outline.map((step: string, i: number) => (
                        <li key={i} className="text-muted-foreground">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Regenerate Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regenerate Analysis
                </Button>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}