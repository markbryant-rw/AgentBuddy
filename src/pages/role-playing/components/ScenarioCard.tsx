import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import type { RoleplayScenario } from '@/hooks/useRoleplayScenarios';

interface ScenarioCardProps {
  scenario: RoleplayScenario;
  isSelected: boolean;
  onClick: () => void;
  isRandom?: boolean;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-700 dark:text-green-400',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  hard: 'bg-red-500/10 text-red-700 dark:text-red-400',
  beginner: 'bg-green-500/10 text-green-700 dark:text-green-400',
  intermediate: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  advanced: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export const ScenarioCard = ({ scenario, isSelected, onClick, isRandom }: ScenarioCardProps) => {
  if (isRandom) {
    return (
      <Card
        className={cn(
          'cursor-pointer transition-all border-2',
          'border-dashed border-primary/30 hover:border-primary',
          'bg-gradient-to-br from-primary/5 to-primary/10'
        )}
        onClick={onClick}
      >
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Badge variant="outline" className="border-primary/30">Random</Badge>
          </div>
          <CardTitle className="text-lg">Random Scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Let AI choose a scenario for you based on the selected difficulty level
          </p>
        </CardContent>
      </Card>
    );
  }

  const difficulty = scenario.difficulty || 'medium';
  const difficultyColor = difficultyColors[difficulty] || difficultyColors.medium;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all border-2',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50'
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge className={difficultyColor}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </Badge>
        </div>
        <CardTitle className="text-lg">{scenario.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{scenario.description}</p>
      </CardContent>
    </Card>
  );
};
