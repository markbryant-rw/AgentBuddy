import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

interface TeamMemberCheckboxListProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const TeamMemberCheckboxList = ({ selectedIds, onChange }: TeamMemberCheckboxListProps) => {
  const { members, isLoading } = useTeamMembers();

  const handleToggle = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter(id => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        No team members found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-2">Select team members</p>
      <div className="max-h-[200px] overflow-y-auto space-y-1">
        {members.map(member => (
          <div 
            key={member.id} 
            className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
            onClick={() => handleToggle(member.id)}
          >
            <Checkbox
              checked={selectedIds.includes(member.id)}
              onCheckedChange={() => handleToggle(member.id)}
            />
            <Avatar className="h-6 w-6">
              <AvatarImage src={member.avatar_url || ''} />
              <AvatarFallback className="text-xs">
                {member.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{member.full_name || member.email}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
