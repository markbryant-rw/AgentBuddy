import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader2 } from 'lucide-react';
import { ScenarioCard } from './ScenarioCard';
import { useRoleplayScenarios } from '@/hooks/useRoleplayScenarios';
import { Skeleton } from '@/components/ui/skeleton';

interface ScenarioGridProps {
  prospectType: 'buyer' | 'seller';
  callType: 'inbound' | 'outbound';
  difficulty: 'easy' | 'medium' | 'hard';
  selectedScenarioId: string | null;
  onSelectScenario: (id: string | null) => void;
}

export const ScenarioGrid = ({
  prospectType,
  callType,
  difficulty,
  selectedScenarioId,
  onSelectScenario,
}: ScenarioGridProps) => {
  const { data: scenarios, isLoading } = useRoleplayScenarios(prospectType, callType);

  const handleSuggestScenario = () => {
    if (!scenarios || scenarios.length === 0) return;
    
    // Filter scenarios by difficulty
    const matchingScenarios = scenarios.filter(s => s.difficulty === difficulty);
    
    // If no matching difficulty, use all scenarios
    const scenariosToChooseFrom = matchingScenarios.length > 0 ? matchingScenarios : scenarios;
    
    // Pick a random scenario
    const randomIndex = Math.floor(Math.random() * scenariosToChooseFrom.length);
    const randomScenario = scenariosToChooseFrom[randomIndex];
    
    onSelectScenario(randomScenario.id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Choose a Scenario</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggestScenario}
            disabled={isLoading || !scenarios || scenarios.length === 0}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Suggest a Scenario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : !scenarios || scenarios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No scenarios available for this configuration.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Regular scenarios */}
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isSelected={selectedScenarioId === scenario.id}
                onClick={() => onSelectScenario(scenario.id)}
              />
            ))}
            
            {/* Random scenario option */}
            <ScenarioCard
              scenario={{} as any}
              isSelected={false}
              onClick={handleSuggestScenario}
              isRandom
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
