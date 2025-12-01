import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Info } from 'lucide-react';

export const CCHExplainer = () => (
  <HoverCard>
    <HoverCardTrigger asChild>
      <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
        <Info className="h-4 w-4" />
      </button>
    </HoverCardTrigger>
    <HoverCardContent className="w-80">
      <div className="space-y-2">
        <h4 className="font-semibold">Customer Contact Hours (CCH)</h4>
        <p className="text-sm text-muted-foreground">
          CCH measures your prospecting activity. It's calculated as:
        </p>
        <ul className="text-sm space-y-1 text-muted-foreground ml-4">
          <li>• 20 calls = 1 hour</li>
          <li>• 1 appraisal = 1 hour</li>
          <li>• 2 open homes = 1 hour</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Target: 10 hours per week keeps your pipeline healthy.
        </p>
      </div>
    </HoverCardContent>
  </HoverCard>
);
