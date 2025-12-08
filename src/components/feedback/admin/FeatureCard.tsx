import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ImageIcon, ArrowRight, CheckCircle, Archive, Brain, AlertCircle, XCircle, Rocket } from 'lucide-react';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  vote_count: number;
  created_at: string;
  user_id: string;
  module?: string;
  source?: string;
  priority?: string;
  archived_reason?: string;
  attachments?: string[];
  ai_analysis?: any;
  ai_priority_score?: number;
  ai_estimated_effort?: string;
  ai_analyzed_at?: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface FeatureCardProps {
  feature: FeatureRequest;
  onClick: () => void;
  onStatusChange: (featureId: string, newStatus: string) => void;
}

// Helper functions for smart module filtering
const shouldShowModule = (module?: string) => {
  if (!module) return false;
  const hiddenModules = ['feedback-centre', 'feedback', 'system', 'general'];
  return !hiddenModules.includes(module.toLowerCase());
};

const moduleDisplayNames: Record<string, string> = {
  'appraisals': 'Appraisals',
  'transactions': 'Transactions',
  'transaction-coordinating': 'Transactions',
  'tasks': 'Tasks',
  'daily-planner': 'Planner',
  'messaging': 'Messages',
  'stock-board': 'Stock',
  'team-management': 'Teams',
  'office-manager': 'Office',
};

const getModuleDisplay = (module?: string) => {
  if (!module) return null;
  return moduleDisplayNames[module.toLowerCase()] || module;
};

// Status transition options based on current status
// Workflow: Triage → In Progress → Needs Review → Completed
const getStatusTransitions = (currentStatus: string) => {
  switch (currentStatus) {
    case 'triage':
    case 'pending':
      return [
        { status: 'in_progress', label: 'Start Building', icon: ArrowRight, variant: 'default' as const },
      ];
    case 'in_progress':
      return [
        { status: 'needs_review', label: 'Move to Review', icon: ArrowRight, variant: 'default' as const },
      ];
    case 'needs_review':
      return [
        { status: 'completed', label: 'Mark as Complete', icon: CheckCircle, variant: 'success' as const },
        { status: 'in_progress', label: 'Back to Progress', icon: ArrowRight, variant: 'secondary' as const },
      ];
    case 'completed':
      return [
        { status: 'archived', label: 'Archive', icon: Archive, variant: 'secondary' as const },
        { status: 'in_progress', label: 'Reopen', icon: ArrowRight, variant: 'secondary' as const },
      ];
    case 'archived':
      return [
        { status: 'in_progress', label: 'Reopen', icon: ArrowRight, variant: 'secondary' as const },
      ];
    default:
      return [];
  }
};

const priorityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

const effortColors: Record<string, string> = {
  small: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  large: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  epic: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export const FeatureCard = ({ feature, onClick, onStatusChange }: FeatureCardProps) => {
  const isCompleted = feature.status === 'completed';
  const isArchived = feature.status === 'archived';
  const completeStyles = isCompleted
    ? 'border-l-4 border-green-500 bg-green-50/50 dark:bg-green-950/20'
    : isArchived
    ? 'border-l-4 border-muted bg-muted/30'
    : '';

  const transitions = getStatusTransitions(feature.status);

  // Check AI analysis status
  const hasAnalysis = !!feature.ai_analysis;
  const analysisStatus = hasAnalysis 
    ? (feature.ai_analysis as any)?.analysis_status || 'success' 
    : null;

  return (
    <Card
      className={cn(
        'p-3 hover:shadow-md transition-all cursor-pointer',
        completeStyles
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Top: Title + Badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* AI Analysis Status Indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0">
                    {hasAnalysis ? (
                      (() => {
                        const priorityScore = feature.ai_priority_score || 0;
                        
                        if (analysisStatus === 'failed') {
                          return <XCircle className="h-3.5 w-3.5 text-red-400" />;
                        }
                        if (priorityScore >= 0.7) {
                          return <Brain className="h-3.5 w-3.5 text-green-500" />;
                        }
                        if (priorityScore >= 0.4) {
                          return <Brain className="h-3.5 w-3.5 text-amber-500" />;
                        }
                        return <Brain className="h-3.5 w-3.5 text-blue-500" />;
                      })()
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {hasAnalysis ? (
                    <div className="text-xs space-y-1">
                      <p className="font-medium">
                        {analysisStatus === 'success' ? '✓ AI Analyzed' : 
                         analysisStatus === 'partial' ? '⚠ Partial Analysis' : 
                         '✗ Analysis Failed'}
                      </p>
                      <p>Priority Score: {Math.round((feature.ai_priority_score || 0) * 100)}%</p>
                      <p>Effort: {feature.ai_estimated_effort || 'unknown'}</p>
                      {(feature.ai_analysis as any)?.implementation_approach && (
                        <p className="text-muted-foreground">
                          {(feature.ai_analysis as any)?.implementation_approach?.slice(0, 80)}...
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs">Pending AI analysis</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <h4 className="text-xs font-semibold line-clamp-2">{feature.title}</h4>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isCompleted ? (
              <Badge variant="outline" className="bg-green-500 text-white text-[10px] px-1.5 border-green-500">
                Complete ✓
              </Badge>
            ) : isArchived ? (
              <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] px-1.5">
                Archived
              </Badge>
            ) : feature.priority ? (
              <Badge variant="outline" className={`${priorityColors[feature.priority as keyof typeof priorityColors] || 'bg-blue-500'} text-white text-[10px] px-1.5`}>
                {feature.priority}
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Description Preview */}
        <p className="text-xs text-muted-foreground line-clamp-2">{feature.description}</p>

        {/* Source + Effort + Module badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Source Badge */}
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] px-1.5",
              feature.source === 'beacon' 
                ? "bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-700" 
                : "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700"
            )}
          >
            {feature.source === 'beacon' ? '🅱️ Beacon' : '🅰️ AgentBuddy'}
          </Badge>

          {/* AI Effort Badge */}
          {feature.ai_estimated_effort && (
            <Badge variant="outline" className={cn("text-[10px]", effortColors[feature.ai_estimated_effort] || '')}>
              <Rocket className="h-3 w-3 mr-1" />
              {feature.ai_estimated_effort}
            </Badge>
          )}

          {/* Module (only if meaningful) */}
          {shouldShowModule(feature.module) && (
            <Badge variant="secondary" className="text-[10px]">
              {getModuleDisplay(feature.module)}
            </Badge>
          )}
        </div>

        {/* Bottom: Reporter + Time + Votes */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={feature.profiles?.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {feature.profiles?.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground">
              {feature.profiles?.full_name || 'Unknown'}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(feature.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Votes + Attachments */}
        <div className="flex items-center gap-3">
          {feature.vote_count > 0 && (
            <span className="text-[10px] text-muted-foreground">
              👍 {feature.vote_count}
            </span>
          )}
          {feature.attachments && feature.attachments.length > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {feature.attachments.length}
            </span>
          )}
        </div>

        {/* Archived Reason (subtle, at bottom) */}
        {isArchived && feature.archived_reason && (
          <div className="text-[10px] text-muted-foreground italic">
            {feature.archived_reason}
          </div>
        )}

        {/* Status Transition Buttons */}
        {transitions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
            {transitions.map((transition, idx) => {
              const Icon = transition.icon;
              const isSuccess = transition.variant === 'success';
              const isPrimary = idx === 0;
              return (
                <Button
                  key={transition.status}
                  variant={isSuccess ? 'default' : isPrimary ? 'outline' : 'ghost'}
                  size="sm"
                  className={cn(
                    "h-7 text-xs font-medium min-w-0",
                    isPrimary && transitions.length === 1 && "flex-1",
                    isSuccess && "bg-green-600 hover:bg-green-700 text-white"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(feature.id, transition.status);
                  }}
                >
                  <Icon className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span className="truncate">{transition.label}</span>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
