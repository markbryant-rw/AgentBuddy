import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, UserPlus, Check, Clock } from 'lucide-react';
import { PresenceDot } from './PresenceDot';

interface OfficeTeamMemberCardProps {
  member: {
    id: string;
    user_id: string;
    full_name: string;
    avatar_url?: string;
    presence_status: string;
    access_level: string;
    week_cch: number;
  };
  isCurrentUser: boolean;
  friendStatus: 'none' | 'friends' | 'pending';
  onMessage: () => void;
  onAddFriend: () => void;
}

export function OfficeTeamMemberCard({
  member,
  isCurrentUser,
  friendStatus,
  onMessage,
  onAddFriend,
}: OfficeTeamMemberCardProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border hover:shadow-md transition-all group bg-card">
      <Avatar className="h-16 w-16 relative">
        <AvatarImage src={member.avatar_url} />
        <AvatarFallback>{member.full_name.charAt(0).toUpperCase()}</AvatarFallback>
        <div className="absolute -bottom-1 -right-1">
          <PresenceDot 
            status={member.presence_status as any}
            lastActive={member.presence_status !== 'active' ? new Date().toISOString() : undefined}
            size="sm"
          />
        </div>
      </Avatar>
      
      <div className="text-center w-full px-1">
        <div className="font-medium text-sm truncate" title={member.full_name}>
          {member.full_name}
        </div>
        <div className="text-xs text-muted-foreground">
          {member.week_cch.toFixed(1)} CCH
        </div>
        {member.access_level === 'admin' && (
          <div className="text-xs text-primary font-medium">Leader</div>
        )}
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={onMessage}
          disabled={isCurrentUser}
          className="h-7 w-7 p-0"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onAddFriend}
          disabled={isCurrentUser || friendStatus === 'friends'}
          className="h-7 w-7 p-0"
        >
          {friendStatus === 'friends' ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : friendStatus === 'pending' ? (
            <Clock className="h-3.5 w-3.5 text-yellow-600" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
