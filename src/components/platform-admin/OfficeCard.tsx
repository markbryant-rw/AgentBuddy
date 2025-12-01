import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, Users2, TrendingUp } from 'lucide-react';
import { OfficeCardData } from '@/hooks/usePlatformOffices';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface OfficeCardProps {
  office: OfficeCardData;
  onClick: () => void;
}

export const OfficeCard = ({ office, onClick }: OfficeCardProps) => {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={office.logo_url || ''} alt={office.name} />
            <AvatarFallback className="bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
              {office.name}
            </h3>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{office.total_users} users</span>
              </div>
              <div className="flex items-center gap-1">
                <Users2 className="h-4 w-4" />
                <span>{office.total_teams} teams</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>{office.active_users} active</span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <div className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                {office.team_leader_count} Leaders
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                {office.salesperson_count} Salespeople
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                {office.assistant_count} Assistants
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
