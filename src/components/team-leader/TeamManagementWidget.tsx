import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, TrendingUp, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTeam } from '@/hooks/useTeam';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function TeamManagementWidget() {
  const navigate = useNavigate();
  const { team } = useTeam();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>Lead and manage your team</CardDescription>
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate('/invite')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Info */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium">{team?.name || 'Your Team'}</p>
            <p className="text-xs text-muted-foreground">Team Code: {team?.team_code || 'N/A'}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-card border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Team Size</span>
            </div>
            <p className="text-2xl font-bold">0</p>
          </div>
          
          <div className="p-3 bg-card border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Team Goal</span>
            </div>
            <p className="text-2xl font-bold">0%</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 pt-2 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            size="sm"
            onClick={() => navigate('/invite')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Team Member
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            View Team Performance
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            size="sm"
          >
            <Target className="h-4 w-4 mr-2" />
            Adjust Team KPIs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
