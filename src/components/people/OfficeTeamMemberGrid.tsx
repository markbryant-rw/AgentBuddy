import { OfficeTeamMemberCard } from './OfficeTeamMemberCard';

interface OfficeTeamMemberGridProps {
  members: Array<{
    id: string;
    user_id: string;
    full_name: string;
    avatar_url?: string;
    presence_status: string;
    access_level: string;
    week_cch: number;
  }>;
  currentUserId?: string;
  getFriendStatus: (userId: string) => 'none' | 'friends' | 'pending';
  onMessage: (userId: string, userName: string) => void;
  onAddFriend: (userId: string) => void;
}

export function OfficeTeamMemberGrid({
  members,
  currentUserId,
  getFriendStatus,
  onMessage,
  onAddFriend,
}: OfficeTeamMemberGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-4 border-t">
      {members.map((member) => (
        <OfficeTeamMemberCard
          key={member.id}
          member={member}
          isCurrentUser={member.user_id === currentUserId}
          friendStatus={getFriendStatus(member.user_id)}
          onMessage={() => onMessage(member.user_id, member.full_name)}
          onAddFriend={() => onAddFriend(member.user_id)}
        />
      ))}
    </div>
  );
}
