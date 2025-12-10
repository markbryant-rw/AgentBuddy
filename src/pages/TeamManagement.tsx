import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Copy, Check, Phone, Cake, Mail, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeaderWithBack } from '@/components/PageHeaderWithBack';
import { PresenceDot } from '@/components/people/PresenceDot';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { format, differenceInDays, setYear } from 'date-fns';

// Helper to get display name and variant for roles
const getRoleDisplay = (role: string): { label: string; variant: 'default' | 'secondary' | 'outline' } | null => {
  switch (role) {
    case 'team_leader':
      return { label: 'Team Leader', variant: 'default' };
    case 'salesperson':
      return { label: 'Salesperson', variant: 'secondary' };
    case 'assistant':
      return { label: 'Assistant', variant: 'outline' };
    default:
      return null;
  }
};

// Helper to check if birthday should be visible
const canSeeBirthday = (visibility: string | null | undefined, isOwnCard: boolean): boolean => {
  if (isOwnCard) return true;
  if (!visibility || visibility === 'private') return false;
  return visibility === 'team_only' || visibility === 'public';
};

// Helper to get birthday display info
const getBirthdayDisplay = (birthday: string | null | undefined) => {
  if (!birthday) return null;
  
  try {
    const birthDate = new Date(birthday);
    const today = new Date();
    const thisYearBirthday = setYear(birthDate, today.getFullYear());
    
    let nextBirthday = thisYearBirthday;
    if (thisYearBirthday < today) {
      nextBirthday = setYear(birthDate, today.getFullYear() + 1);
    }
    
    const daysUntil = differenceInDays(nextBirthday, today);
    const formattedDate = format(birthDate, 'MMM d');
    
    if (daysUntil === 0) {
      return { text: "Today! 🎉", isToday: true, isUpcoming: false, daysUntil: 0 };
    } else if (daysUntil <= 7 && daysUntil > 0) {
      return { text: `${formattedDate} (${daysUntil}d)`, isToday: false, isUpcoming: true, daysUntil };
    }
    
    return { text: formattedDate, isToday: false, isUpcoming: false, daysUntil };
  } catch {
    return null;
  }
};

export default function TeamManagement() {
  const { user, hasAnyRole } = useAuth();
  const { team } = useTeam();
  const { members } = useTeamMembers();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const canManageTeam = hasAnyRole(['platform_admin', 'office_manager', 'team_leader']);

  const handleCopyCode = () => {
    if (team?.team_code) {
      navigator.clipboard.writeText(team.team_code);
      setCopied(true);
      toast.success("Team code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!canManageTeam) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access team management.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeaderWithBack
        title="Team Management"
        description="Manage your team members, roles, and settings"
      />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/invite-user')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Invite Member</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Add new team members to your team
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>

          {/* Team Code Card - Moved here from Settings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Code</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-xl font-bold">{team?.team_code || '—'}</div>
              <p className="text-xs text-muted-foreground">Share to invite members</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {team?.name || 'Your Team'} - {members?.length || 0} members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members && members.length > 0 ? (
                members.map((member) => {
                  const displayRoles = (member.roles || [])
                    .map(getRoleDisplay)
                    .filter(Boolean) as { label: string; variant: 'default' | 'secondary' | 'outline' }[];

                  const isCurrentUser = member.id === user?.id;
                  const birthdayVisible = canSeeBirthday(member.birthday_visibility, isCurrentUser);
                  const birthdayInfo = birthdayVisible ? getBirthdayDisplay(member.birthday) : null;

                  return (
                    <div
                      key={member.user_id}
                      className={`flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
                        birthdayInfo?.isToday ? 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800' : ''
                      } ${birthdayInfo?.isUpcoming ? 'bg-pink-50/50 dark:bg-pink-950/10' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar with Presence */}
                        <div className="relative">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-lg">
                              {member.full_name?.[0] || member.email?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <PresenceDot 
                              status={member.presence_status || 'offline'} 
                              lastActive={member.last_active_at}
                              size="md"
                            />
                          </div>
                          {birthdayInfo?.isToday && (
                            <div className="absolute -top-1 -right-1 text-lg">🎂</div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {member.full_name || member.email || 'Unknown'}
                            </p>
                            {birthdayInfo?.isUpcoming && !birthdayInfo.isToday && (
                              <Cake className="h-4 w-4 text-pink-500" />
                            )}
                          </div>

                          {/* Contact Details Row */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {member.email && (
                              <a
                                href={`mailto:${member.email}`}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{member.email}</span>
                              </a>
                            )}
                            <div className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{member.mobile || '—'}</span>
                            </div>
                            {birthdayInfo && (
                              <div className={`flex items-center gap-1 ${
                                birthdayInfo.isToday ? 'text-pink-600 font-medium' : 
                                birthdayInfo.isUpcoming ? 'text-pink-500' : ''
                              }`}>
                                <Cake className="h-3.5 w-3.5" />
                                <span>{birthdayInfo.text}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Roles */}
                        <div className="flex items-center gap-2">
                          {displayRoles.map((role, idx) => (
                            <Badge key={idx} variant={role.variant}>
                              {role.label}
                            </Badge>
                          ))}
                        </div>

                        {/* Message Button */}
                        {!isCurrentUser && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground/50 cursor-not-allowed"
                                  disabled
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Direct messaging coming soon</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No team members found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
