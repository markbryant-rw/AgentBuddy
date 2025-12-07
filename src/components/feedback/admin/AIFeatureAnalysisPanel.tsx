import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, ChevronDown, Copy, Target, AlertTriangle, Lightbulb, Code, Rocket, Check, CheckCircle2, XCircle, Clock, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AIFeatureAnalysisPanelProps {
  featureId: string;
  initialAnalysis?: any;
  isAdmin?: boolean;
}

export function AIFeatureAnalysisPanel({ featureId, initialAnalysis, isAdmin }: AIFeatureAnalysisPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-feature-request', {
        body: { featureRequestId: featureId }
      });
      
      if (error) throw error;
      return data.analysis;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success('AI analysis complete!');
      queryClient.invalidateQueries({ queryKey: ['feature-request-detail', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-requests-kanban'] });
      setIsOpen(true);
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });

  const [copiedBuildPrompt, setCopiedBuildPrompt] = useState(false);

  const copyBuildPrompt = () => {
    if (analysis?.build_it_prompt) {
      navigator.clipboard.writeText(analysis.build_it_prompt);
      setCopiedBuildPrompt(true);
      toast.success('Build prompt copied! Paste it into Lovable to implement the feature.');
      setTimeout(() => setCopiedBuildPrompt(false), 2000);
    }
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard!');
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'small':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      case 'large':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'epic':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-amber-600';
    return 'text-blue-600';
  };

  if (!isAdmin) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <Card className="border-2 border-primary/20">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">AI Feature Planner</h4>
              {analysis && (
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
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
                {/* Build It Prompt - Primary Action */}
                {analysis.build_it_prompt && (
                  <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Rocket className="h-5 w-5 text-primary" />
                          <h5 className="font-semibold text-primary">Build It Prompt</h5>
                        </div>
                        <Button
                          size="sm"
                          onClick={copyBuildPrompt}
                          className="gap-2"
                        >
                          {copiedBuildPrompt ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy & Build in Lovable
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="bg-background rounded-lg p-3 border">
                        <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/90 leading-relaxed">
                          {analysis.build_it_prompt}
                        </pre>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Copy this prompt and paste it into Lovable to implement the feature
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Overview Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Complexity:</span>
                    <Badge variant="outline" className={getComplexityColor(analysis.technical_complexity)}>
                      {analysis.technical_complexity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Effort:</span>
                    <Badge variant="outline" className={getEffortColor(analysis.estimated_effort)}>
                      {analysis.estimated_effort}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Priority:</span>
                    <span className={cn("font-semibold", getPriorityColor(analysis.priority_score))}>
                      {Math.round(analysis.priority_score * 100)}%
                    </span>
                  </div>
                </div>

                {/* Estimated Days */}
                {analysis.estimated_days && (
                  <div className="text-sm text-muted-foreground">
                    Estimated: <span className="font-medium text-foreground">{analysis.estimated_days} days</span>
                  </div>
                )}

                {/* Implementation Approach */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h5 className="font-medium">Implementation Approach</h5>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.implementation_approach}</p>
                </div>

                {/* MVP Scope */}
                {analysis.mvp_scope && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-green-600" />
                      <h5 className="font-medium text-sm">MVP Scope</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.mvp_scope}</p>
                  </div>
                )}

                {/* Affected Components */}
                {analysis.affected_components?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-primary" />
                      <h5 className="font-medium text-sm">Affected Components</h5>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.affected_components.map((component: string, i: number) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {component}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependencies */}
                {analysis.dependencies?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Dependencies</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {analysis.dependencies.map((dep: string, i: number) => (
                        <li key={i}>• {dep}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {analysis.risks?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <h5 className="font-medium text-sm">Risks</h5>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {analysis.risks.map((risk: string, i: number) => (
                        <li key={i}>• {risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Nice to Have */}
                {analysis.nice_to_have?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm text-muted-foreground">Nice to Have (Post-MVP)</h5>
                    <div className="flex flex-wrap gap-2">
                      {analysis.nice_to_have.map((item: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative Approaches */}
                {analysis.alternative_approaches?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Alternative Approaches</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {analysis.alternative_approaches.map((approach: string, i: number) => (
                        <li key={i}>• {approach}</li>
                      ))}
                    </ul>
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
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => copyPrompt(item.prompt)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Re-analyze button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending}
                  className="w-full"
                >
                  {analyzeMutation.isPending ? 'Re-analyzing...' : 'Re-analyze with AI'}
                </Button>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
