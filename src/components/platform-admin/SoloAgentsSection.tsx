import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { UserX } from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminUsers';
import { CompactUserCard } from './CompactUserCard';

interface SoloAgentsSectionProps {
  soloAgents: AdminUser[];
  onViewDetails: (userId: string) => void;
  onRepair?: (user: AdminUser) => void;
}

export const SoloAgentsSection = ({ soloAgents, onViewDetails, onRepair }: SoloAgentsSectionProps) => {
  if (soloAgents.length === 0) return null;

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="solo-agents" className="border rounded-lg border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
        <AccordionTrigger className="px-4 hover:no-underline hover:bg-amber-100/50 dark:hover:bg-amber-900/20">
          <div className="flex items-center gap-3 flex-1">
            <UserX className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-amber-900 dark:text-amber-100">Solo Agents</span>
            <Badge variant="outline" className="ml-auto mr-2 border-amber-600 text-amber-600">
              {soloAgents.length}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2 mt-2">
            {soloAgents.map((agent) => (
              <CompactUserCard
                key={agent.id}
                user={agent}
                onViewDetails={onViewDetails}
                onRepair={onRepair}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
