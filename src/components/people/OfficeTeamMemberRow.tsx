import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, UserPlus, Check, Clock } from 'lucide-react';
import { PresenceDot } from './PresenceDot';

interface OfficeTeamMemberRowProps {
  member: {
    id: string;
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

export function OfficeTeamMemberRow({
  member,
  isCurrentUser,
  friendStatus,
  onMessage,
  onAddFriend,
}: OfficeTeamMemberRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/30 transition-colors">
      <Avatar className="h-10 w-10 relative">
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
      
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{member.full_name}</div>
        <div className="text-xs text-muted-foreground">
          {member.access_level === 'admin' ? 'Team Leader' : 'Member'} · {member.week_cch.toFixed(1)} CCH
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onMessage}
          disabled={isCurrentUser}
          className="h-8 w-8 p-0"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onAddFriend}
          disabled={isCurrentUser || friendStatus === 'friends'}
          className="h-8 w-8 p-0"
        >
          {friendStatus === 'friends' ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : friendStatus === 'pending' ? (
            <Clock className="h-4 w-4 text-yellow-600" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
