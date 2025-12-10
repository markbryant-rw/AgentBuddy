import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/hooks/useTeam";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/hooks/useAuth";
import { Users, Building2, Mail, Settings, Phone, Cake, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { PresenceDot } from "@/components/people/PresenceDot";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays, setYear } from "date-fns";

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
    
    // If birthday has passed this year, check next year
    let nextBirthday = thisYearBirthday;
    if (thisYearBirthday < today) {
      nextBirthday = setYear(birthDate, today.getFullYear() + 1);
    }
    
    const daysUntil = differenceInDays(nextBirthday, today);
    const formattedDate = format(birthDate, 'MMM d');
    
    if (daysUntil === 0) {
      return { 
        text: "Today! 🎉", 
        isToday: true, 
        isUpcoming: false,
        daysUntil: 0 
      };
    } else if (daysUntil <= 7 && daysUntil > 0) {
      return { 
        text: `${formattedDate} (${daysUntil}d)`, 
        isToday: false, 
        isUpcoming: true,
        daysUntil 
      };
    }
    
    return { 
      text: formattedDate, 
      isToday: false, 
      isUpcoming: false,
      daysUntil 
    };
  } catch {
    return null;
  }
};

export const TeamManagementSection = () => {
  const { team } = useTeam();
  const { members, isLoading } = useTeamMembers();
  const { user, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  
  const canManageTeam = hasAnyRole(['team_leader', 'platform_admin', 'office_manager']);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Team
          </CardTitle>
          <CardDescription>
            {team?.name} • {members.length} member{members.length !== 1 ? 's' : ''}
          </CardDescription>
        </div>
        {canManageTeam && team && (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => navigate('/team-management')}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Team
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {team ? (
          <div className="space-y-6">
            {/* Team Name */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{team.name}</h3>
                {team.bio && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {team.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Team Members */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Team Members
              </h4>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading members...</div>
              ) : members.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {members.map((member) => {
                    const displayRoles = (member.roles || [])
                      .map(getRoleDisplay)
                      .filter(Boolean) as { label: string; variant: 'default' | 'secondary' | 'outline' }[];

                    const isCurrentUser = member.id === user?.id;
                    const birthdayVisible = canSeeBirthday(member.birthday_visibility, isCurrentUser);
                    const birthdayInfo = birthdayVisible ? getBirthdayDisplay(member.birthday) : null;

                    return (
                      <div
                        key={member.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors ${
                          birthdayInfo?.isToday ? 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800' : ''
                        } ${birthdayInfo?.isUpcoming ? 'bg-pink-50/50 dark:bg-pink-950/10' : ''}`}
                      >
                        {/* Avatar with Presence */}
                        <div className="relative">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={member.avatar_url || ''} />
                            <AvatarFallback className="text-lg bg-primary/10 text-primary">
                              {member.full_name?.[0] || '?'}
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

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {member.full_name || 'Unknown'}
                            </p>
                            {birthdayInfo?.isUpcoming && !birthdayInfo.isToday && (
                              <Cake className="h-3.5 w-3.5 text-pink-500" />
                            )}
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-0.5 mt-1">
                            {member.email && (
                              <a
                                href={`mailto:${member.email}`}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{member.email}</span>
                              </a>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{member.mobile || '—'}</span>
                            </div>
                            {birthdayInfo && (
                              <div className={`flex items-center gap-1.5 text-xs ${
                                birthdayInfo.isToday ? 'text-pink-600 font-medium' : 
                                birthdayInfo.isUpcoming ? 'text-pink-500' : 'text-muted-foreground'
                              }`}>
                                <Cake className="h-3 w-3" />
                                <span>{birthdayInfo.text}</span>
                              </div>
                            )}
                          </div>

                          {/* Roles */}
                          {displayRoles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {displayRoles.map((role, idx) => (
                                <Badge key={idx} variant={role.variant} className="text-xs">
                                  {role.label}
                                </Badge>
                              ))}
                            </div>
                          )}
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
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No team members found</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>You are not currently assigned to a team</p>
            <p className="text-sm mt-1">Contact your administrator to be added to a team</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
