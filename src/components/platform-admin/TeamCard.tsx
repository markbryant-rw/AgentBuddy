import { Card, CardContent } from '@/components/ui/card';
import { Users2, ChevronDown, ChevronUp } from 'lucide-react';
import { TeamWithMembers } from '@/hooks/usePlatformOfficeDetail';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { UserCard } from './UserCard';
import { useTeamMembers } from '@/hooks/usePlatformOfficeDetail';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamCardProps {
  team: TeamWithMembers;
}

export const TeamCard = ({ team }: TeamCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: members, isLoading } = useTeamMembers(isExpanded ? team.id : undefined);

  return (
    <Card className="border-l-4 border-l-secondary">
      <CardContent className="p-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary/30 flex items-center justify-center">
              <Users2 className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h4 className="font-semibold">{team.name}</h4>
              <p className="text-sm text-muted-foreground">
                {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(team.member_count)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : members && members.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <UserCard key={member.id} user={member} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No members found
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
