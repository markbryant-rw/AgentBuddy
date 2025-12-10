import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/hooks/useTeam";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { Users, Mail, Settings, Phone, Cake, MessageCircle } from "lucide-react";
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
    
    // If birthday has passed this year, check next year
    let nextBirthday = thisYearBirthday;
    if (thisYearBirthday < today) {
      nextBirthday = setYear(birthDate, today.getFullYear() + 1);
    }
    
    const daysUntil = differenceInDays(nextBirthday, today);
    const formattedDate = format(birthDate, 'MMM d');
    
    // Only show if within 14 days
    if (daysUntil > 14) return null;
    
    if (daysUntil === 0) {
      return { 
        text: "Today! 🎉", 
        isToday: true, 
        isUpcoming: false,
        daysUntil: 0 
      };
    } else if (daysUntil <= 7 && daysUntil > 0) {
      return { 
        text: `${formattedDate} (${daysUntil}d 🎂)`, 
        isToday: false, 
        isUpcoming: true,
        daysUntil 
      };
    } else if (daysUntil <= 14) {
      return { 
        text: `${formattedDate} (${daysUntil}d)`, 
        isToday: false, 
        isUpcoming: true,
        daysUntil 
      };
    }
    
    return null;
  } catch {
    return null;
  }
};

export const TeamManagementSection = () => {
  const { team } = useTeam();
  const { members, isLoading } = useTeamMembers();
  const { user, hasAnyRole } = useAuth();
  const { allPresence } = usePresence();
  const navigate = useNavigate();
  
  const canManageTeam = hasAnyRole(['team_leader', 'platform_admin', 'office_manager']);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5" />
            {team?.name || 'Your Team'}
          </CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? 's' : ''}
            {team?.bio && ` • ${team.bio}`}
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
          <div>
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
                  
                  // Use real-time presence if available, fallback to stored presence
                  const effectivePresence = allPresence[member.id] || member.presence_status || 'offline';

                  return (
                    <div
                      key={member.id}
                      className={`flex items-stretch gap-4 rounded-lg border bg-card transition-colors overflow-hidden ${
                        birthdayInfo?.isToday ? 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800' : ''
                      } ${birthdayInfo?.isUpcoming ? 'bg-pink-50/50 dark:bg-pink-950/10' : ''}`}
                    >
                      {/* Avatar - Full height */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-full w-20 rounded-none">
                          <AvatarImage src={member.avatar_url || ''} className="object-cover" />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary rounded-none h-full">
                            {member.full_name?.[0] || '?'}
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

                      <div className="flex-1 min-w-0 py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {member.full_name || 'Unknown'}
                          </p>
                          {birthdayInfo?.isUpcoming && !birthdayInfo.isToday && (
                            <Cake className="h-4 w-4 text-pink-500 flex-shrink-0" />
                          )}
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-0.5 mt-1">
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </a>
                          )}
                          {member.mobile && (
                            <a
                              href={`tel:${member.mobile}`}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span>{member.mobile}</span>
                            </a>
                          )}
                          {birthdayInfo && (
                            <div className={`flex items-center gap-1.5 text-xs ${
                              birthdayInfo.isToday ? 'text-pink-600 font-medium' : 
                              birthdayInfo.isUpcoming ? 'text-pink-500' : 'text-muted-foreground'
                            }`}>
                              <Cake className="h-3 w-3 flex-shrink-0" />
                              <span>{birthdayInfo.text}</span>
                            </div>
                          )}
                        </div>

                        {/* Roles and Message Button */}
                        <div className="flex items-center justify-between mt-2">
                          {displayRoles.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {displayRoles.map((role, idx) => (
                                <Badge key={idx} variant={role.variant} className="text-xs">
                                  {role.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {!isCurrentUser && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground/50 cursor-not-allowed ml-auto"
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
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No team members found</p>
            )}
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
