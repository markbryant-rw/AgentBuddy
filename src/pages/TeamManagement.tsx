import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { usePresence } from '@/hooks/usePresence';
import { useTeamMemberAnalytics } from '@/hooks/useTeamMemberAnalytics';
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
import { QuickMessageDialog } from '@/components/team/QuickMessageDialog';
import { TeamAnalyticsSummary } from '@/components/team-management/TeamAnalyticsSummary';
import { MemberPerformanceStats } from '@/components/team-management/MemberPerformanceStats';

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

// Helper to check if birthday should be visible - only show within 14 days
const canSeeBirthday = (visibility: string | null | undefined, isOwnCard: boolean): boolean => {
  if (isOwnCard) return true;
  if (!visibility || visibility === 'private') return false;
  return visibility === 'team_only' || visibility === 'public';
};

// Helper to get birthday display info - only returns if within 14 days
const getBirthdayDisplay = (birthday: string | null | undefined) => {
  if (!birthday) return null;
  
  try {
    const birthDate = new Date(birthday);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisYearBirthday = setYear(birthDate, today.getFullYear());
    thisYearBirthday.setHours(0, 0, 0, 0);
    
    let nextBirthday = thisYearBirthday;
    if (thisYearBirthday < today) {
      nextBirthday = setYear(birthDate, today.getFullYear() + 1);
    }
    
    const daysUntil = differenceInDays(nextBirthday, today);
    const formattedDate = format(birthDate, 'MMM d');
    
    // Only show if within 14 days
    if (daysUntil > 14) return null;
    
    if (daysUntil === 0) {
      return { text: "Today! 🎉", isToday: true, isUpcoming: false, daysUntil: 0 };
    } else if (daysUntil <= 7 && daysUntil > 0) {
      return { text: `${formattedDate} (${daysUntil}d 🎂)`, isToday: false, isUpcoming: true, daysUntil };
    } else if (daysUntil <= 14) {
      return { text: `${formattedDate} (${daysUntil}d)`, isToday: false, isUpcoming: true, daysUntil };
    }
    
    return null;
  } catch {
    return null;
  }
};

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`);
};

export default function TeamManagement() {
  const { user, hasAnyRole } = useAuth();
  const { team } = useTeam();
  const { members } = useTeamMembers();
  const { allPresence } = usePresence();
  const { data: analyticsData, isLoading: analyticsLoading } = useTeamMemberAnalytics(team?.id);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<{
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null>(null);

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

      {/* Team Analytics Summary */}
        {analyticsData && (
          <TeamAnalyticsSummary summary={analyticsData.summary} isLoading={analyticsLoading} />
        )}

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
                  
                  // Use real-time presence if available, fallback to stored presence
                  const effectivePresence = allPresence[member.id] || member.presence_status || 'offline';

                  return (
                    <div
                      key={member.user_id}
                      className={`flex items-stretch rounded-lg border bg-card hover:bg-accent/50 transition-colors overflow-hidden ${
                        birthdayInfo?.isToday ? 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800' : ''
                      } ${birthdayInfo?.isUpcoming ? 'bg-pink-50/50 dark:bg-pink-950/10' : ''}`}
                    >
                      {/* Avatar - Full height */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-full w-24 rounded-none">
                          <AvatarImage src={member.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary rounded-none h-full">
                            {member.full_name?.[0] || member.email?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-2 right-2">
                          <PresenceDot 
                            status={effectivePresence} 
                            lastActive={member.last_active_at}
                            size="md"
                          />
                        </div>
                        {birthdayInfo?.isToday && (
                          <div className="absolute top-1 right-1 text-lg">🎂</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-lg">
                            {member.full_name || member.email || 'Unknown'}
                          </p>
                          {birthdayInfo?.isUpcoming && !birthdayInfo.isToday && (
                            <Cake className="h-4 w-4 text-pink-500" />
                          )}
                        </div>

                        {/* Contact Details Row with Copy Icons */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          {member.email && (
                            <div className="flex items-center gap-1 group">
                              <a
                                href={`mailto:${member.email}`}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <Mail className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{member.email}</span>
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => copyToClipboard(member.email!, 'Email')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {member.mobile && (
                            <div className="flex items-center gap-1 group">
                              <a
                                href={`tel:${member.mobile}`}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                <span>{member.mobile}</span>
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => copyToClipboard(member.mobile!, 'Phone number')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
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

                        {/* Roles */}
                        {displayRoles.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            {displayRoles.map((role, idx) => (
                              <Badge key={idx} variant={role.variant}>
                                {role.label}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Performance Stats */}
                        <MemberPerformanceStats analytics={analyticsData?.members[member.id]} />
                      </div>

                      {/* Message Panel - Full height right side */}
                      {!isCurrentUser && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="group flex items-center justify-center border-l bg-muted/30 
                                           w-14 hover:w-28 transition-all duration-300 cursor-pointer
                                           hover:bg-primary/5"
                                onClick={() => setMessageRecipient({
                                  id: member.id,
                                  full_name: member.full_name || 'Unknown',
                                  avatar_url: member.avatar_url
                                })}
                              >
                                <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                                  <MessageCircle className="h-5 w-5" />
                                  <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 
                                                   transition-opacity whitespace-nowrap">
                                    Send Message
                                  </span>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p>Send a quick message</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
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

      <QuickMessageDialog
        open={!!messageRecipient}
        onOpenChange={(open) => !open && setMessageRecipient(null)}
        recipient={messageRecipient}
      />
    </div>
  );
}
