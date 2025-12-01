import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminUsers';
import { CompactUserCard } from './CompactUserCard';

interface TeamSectionProps {
  teamId: string;
  teamName: string;
  members: AdminUser[];
  onViewDetails: (userId: string) => void;
  onRepair?: (user: AdminUser) => void;
  defaultOpen?: boolean;
}

export const TeamSection = ({ 
  teamId, 
  teamName, 
  members, 
  onViewDetails, 
  onRepair,
  defaultOpen = false 
}: TeamSectionProps) => {
  const teamLeaders = members.filter(m => m.roles.includes('team_leader'));
  
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? teamId : undefined}>
      <AccordionItem value={teamId} className="border rounded-lg">
        <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/5">
          <div className="flex items-center gap-3 flex-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{teamName}</span>
            <Badge variant="secondary" className="ml-auto mr-2">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2 mt-2">
            {/* Team Leaders first */}
            {teamLeaders.map((leader) => (
              <CompactUserCard
                key={leader.id}
                user={leader}
                onViewDetails={onViewDetails}
                onRepair={onRepair}
              />
            ))}
            {/* Then other members */}
            {members.filter(m => !m.roles.includes('team_leader')).map((member) => (
              <CompactUserCard
                key={member.id}
                user={member}
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
