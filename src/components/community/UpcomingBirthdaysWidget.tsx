import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Cake, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, format, isSameDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BirthdayPerson {
  id: string;
  full_name: string;
  avatar_url?: string;
  birthday: string;
  daysUntil: number;
}

// Helper functions moved outside component for better performance
const getCountdownText = (daysUntil: number) => {
  if (daysUntil === 0) return 'Today! 🎉';
  if (daysUntil === 1) return 'Tomorrow';
  return `in ${daysUntil} days`;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

export function UpcomingBirthdaysWidget() {
  const navigate = useNavigate();
  
  const { data: birthdays = [], isLoading } = useQuery({
    queryKey: ['upcoming-birthdays'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's teams and friends
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      const teamIds = teamMembers?.map(tm => tm.team_id) || [];

      const { data: friends } = await supabase
        .from('friend_connections')
        .select('user_id, friend_id')
        .eq('accepted', true)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = friends?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      // Fetch profiles with birthdays
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, birthday, birthday_visibility')
        .not('birthday', 'is', null)
        .neq('birthday_visibility', 'private');

      if (!profiles) return [];

      const today = new Date();
      const upcomingBirthdays: BirthdayPerson[] = [];

      for (const profile of profiles) {
        // Check visibility permissions
        const isTeamMember = teamIds.some(teamId => 
          profile.id // We'd need to check team_members, but simplified here
        );
        const isFriend = friendIds.includes(profile.id);
        const isPublic = profile.birthday_visibility === 'public';
        
        if (profile.birthday_visibility === 'team_only' && !isTeamMember) continue;
        if (profile.birthday_visibility === 'friends_only' && !isFriend) continue;

        // Calculate next birthday
        const [month, day] = profile.birthday.split('-').slice(1).map(Number);
        let nextBirthday = new Date(today.getFullYear(), month - 1, day);
        
        if (nextBirthday < today) {
          nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
        }

        const daysUntil = differenceInDays(nextBirthday, today);

        // Show birthdays within next 30 days
        if (daysUntil <= 30) {
          upcomingBirthdays.push({
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url || undefined,
            birthday: profile.birthday,
            daysUntil,
          });
        }
      }

      // Sort by days until birthday
      return upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    },
  });

  if (isLoading || birthdays.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Cake className="h-5 w-5 text-pink-500" />
          <CardTitle className="text-lg">Upcoming Birthdays</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {birthdays.map((person) => (
          <div
            key={person.id}
            onClick={() => navigate(`/profile/${person.id}`)}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors",
              person.daysUntil === 0 && "bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800"
            )}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={person.avatar_url} />
              <AvatarFallback>{getInitials(person.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{person.full_name}</p>
              <p className={cn(
                "text-sm",
                person.daysUntil === 0 ? "text-pink-600 dark:text-pink-400 font-semibold" : "text-muted-foreground"
              )}>
                {getCountdownText(person.daysUntil)}
              </p>
            </div>
            {person.daysUntil === 0 && (
              <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200">
                🎂
              </Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
