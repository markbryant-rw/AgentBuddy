import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Home, ArrowLeft } from 'lucide-react';
import { CallTypeSelector } from './components/CallTypeSelector';
import { DifficultySelector } from './components/DifficultySelector';
import { ScenarioGrid } from './components/ScenarioGrid';
import { useRoleplayScenarios } from '@/hooks/useRoleplayScenarios';

type ProspectType = 'buyer' | 'seller' | null;
type CallType = 'inbound' | 'outbound' | null;
type Difficulty = 'easy' | 'medium' | 'hard';

const RolePlaying = () => {
  const [prospectType, setProspectType] = useState<ProspectType>(null);
  const [callType, setCallType] = useState<CallType>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const { isLoading } = useRoleplayScenarios();

  const handleReset = () => {
    setProspectType(null);
    setCallType(null);
    setDifficulty('easy');
    setSelectedScenarioId(null);
  };

  const handleStartPractice = () => {
    // TODO: Navigate to voice session
    console.log('Starting practice:', { prospectType, callType, difficulty, selectedScenarioId });
  };

  // Landing page - Choose Buyer or Seller
  if (!prospectType) {
    if (isLoading) {
      return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center mb-12">
            <Skeleton className="h-12 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-[500px] mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Practice Real Estate Prospecting</h1>
          <p className="text-lg text-muted-foreground">
            Build confidence and refine your skills with AI-powered role-play scenarios
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Buyer Prospects Card */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all cursor-pointer group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5" />
            <CardHeader className="relative">
              <div className="w-16 h-16 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <Home className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Buyer Prospects</CardTitle>
              <CardDescription className="text-base">
                Practice working with potential home buyers
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• First-time home buyers</li>
                <li>• Investment property seekers</li>
                <li>• Upgrading/downsizing clients</li>
                <li>• Various budget ranges</li>
              </ul>
              <div className="relative">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Show coming soon modal
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 bg-green-600/95 flex items-center justify-center z-50 cursor-pointer animate-in fade-in';
                    modal.innerHTML = `
                      <div class="text-center text-white p-8">
                        <h2 class="text-4xl font-bold mb-4">Coming Soon</h2>
                        <p class="text-xl mb-6">Buyer prospect scenarios are being developed</p>
                        <p class="text-lg opacity-80">Click anywhere to go back</p>
                      </div>
                    `;
                    modal.onclick = () => modal.remove();
                    document.body.appendChild(modal);
                  }}
                >
                  Start Practice
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Seller Prospects Card */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all cursor-pointer group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
            <CardHeader className="relative">
              <div className="w-16 h-16 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Phone className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Seller Prospects</CardTitle>
              <CardDescription className="text-base">
                Practice conversations with potential sellers
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Past client referrals</li>
                <li>• Cold leads and appraisals</li>
                <li>• Database callbacks</li>
                <li>• Various difficulty levels</li>
              </ul>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setProspectType('seller')}
              >
                Start Practice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Configuration flow for Seller prospects
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Enhanced Header with gradient */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 mb-8 shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-white hover:bg-white/20 mb-4 transition-all"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white/20">
            <Phone className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1">Configure Your Practice</h1>
            <p className="text-blue-100">
              {prospectType === 'seller' ? 'Seller Prospect' : 'Buyer Prospect'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Step 1: Call Type */}
        <CallTypeSelector
          value={callType}
          onChange={setCallType}
        />

        {/* Step 2: Difficulty Level */}
        {callType && (
          <DifficultySelector
            value={difficulty}
            onChange={setDifficulty}
          />
        )}

        {/* Step 3: Scenario Selection */}
        {callType && (
          <ScenarioGrid
            prospectType={prospectType}
            callType={callType}
            difficulty={difficulty}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={setSelectedScenarioId}
          />
        )}

        {/* Start Practice Button */}
        {selectedScenarioId && (
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              className="px-12"
              onClick={handleStartPractice}
            >
              Start Practice Session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RolePlaying;
