import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, ChevronDown, Copy, Target, AlertTriangle, Lightbulb, Code, HelpCircle, Wrench, Rocket, Check, FileEdit, ShieldAlert, XCircle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AIBugAnalysisPanelProps {
  bugId: string;
  initialAnalysis?: any;
  isAdmin?: boolean;
  onApplySuggestions?: (updates: { summary?: string; description?: string; severity?: string }) => void;
}

export function AIBugAnalysisPanel({ bugId, initialAnalysis, isAdmin, onApplySuggestions }: AIBugAnalysisPanelProps) {
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
      const status = data.analysis_status || 'success';
      if (status === 'success') {
        toast.success('AI analysis complete!');
      } else if (status === 'partial') {
        toast.warning('AI analysis completed with limited confidence');
      } else {
        toast.error('AI could not fully analyze this bug');
      }
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

  const handleApplySuggestions = () => {
    if (!analysis || !onApplySuggestions) return;
    
    const updates: { summary?: string; description?: string; severity?: string } = {};
    
    if (analysis.improved_summary) {
      updates.summary = analysis.improved_summary;
    }
    if (analysis.improved_description) {
      updates.description = analysis.improved_description;
    }
    if (analysis.suggested_severity) {
      updates.severity = analysis.suggested_severity;
    }
    
    onApplySuggestions(updates);
    toast.success('AI suggestions applied!');
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

  const getAnalysisStatusBadge = () => {
    if (!analysis) return null;
    const status = analysis.analysis_status || 'success';
    
    switch (status) {
      case 'success':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Analyzed
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getReportQualityBadge = () => {
    if (!analysis?.report_quality) return null;
    
    const colors = {
      excellent: 'bg-green-100 text-green-700',
      good: 'bg-blue-100 text-blue-700',
      needs_improvement: 'bg-amber-100 text-amber-700',
      poor: 'bg-red-100 text-red-700'
    };
    
    return (
      <Badge variant="outline" className={colors[analysis.report_quality as keyof typeof colors] || ''}>
        Report: {analysis.report_quality?.replace('_', ' ')}
      </Badge>
    );
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
              {getAnalysisStatusBadge()}
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
                {/* Analysis Status Notes */}
                {analysis.analysis_notes && (
                  <div className={cn(
                    "p-3 rounded-lg text-sm",
                    analysis.analysis_status === 'failed' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                    analysis.analysis_status === 'partial' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' :
                    'bg-muted'
                  )}>
                    {analysis.analysis_notes}
                  </div>
                )}

                {/* AI Suggested Severity */}
                {analysis.suggested_severity && (
                  <Card className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-200 dark:border-violet-800">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="h-5 w-5 text-violet-600 mt-0.5" />
                          <div>
                            <h5 className="font-medium text-violet-900 dark:text-violet-100 mb-1">AI Suggested Severity</h5>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={cn(
                                "text-white",
                                analysis.suggested_severity === 'critical' ? 'bg-red-500' :
                                analysis.suggested_severity === 'high' ? 'bg-orange-500' :
                                analysis.suggested_severity === 'medium' ? 'bg-amber-500' :
                                'bg-blue-500'
                              )}>
                                {analysis.suggested_severity}
                              </Badge>
                              {getReportQualityBadge()}
                            </div>
                            {analysis.severity_reasoning && (
                              <p className="text-sm text-violet-700 dark:text-violet-300">{analysis.severity_reasoning}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Improved Report */}
                {(analysis.improved_summary || analysis.improved_description) && analysis.report_quality !== 'excellent' && (
                  <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileEdit className="h-5 w-5 text-blue-600" />
                          <h5 className="font-semibold text-blue-900 dark:text-blue-100">AI-Improved Report</h5>
                        </div>
                        {onApplySuggestions && (
                          <Button size="sm" variant="outline" onClick={handleApplySuggestions}>
                            Apply Suggestions
                          </Button>
                        )}
                      </div>
                      {analysis.improved_summary && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Suggested Title:</p>
                          <p className="text-sm font-medium bg-white/50 dark:bg-black/20 p-2 rounded">{analysis.improved_summary}</p>
                        </div>
                      )}
                      {analysis.improved_description && (
                        <div>
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Suggested Description:</p>
                          <p className="text-sm bg-white/50 dark:bg-black/20 p-2 rounded whitespace-pre-wrap">{analysis.improved_description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 🚀 Fix It Prompt - Primary Action */}
                {analysis.lovable_fix_prompt && !analysis.needs_more_info && analysis.analysis_status !== 'failed' && (
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