import { useState, useMemo, useCallback } from 'react';
import { Edit, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOfficeTeamsUsers } from '@/hooks/useOfficeTeamsUsers';
import { EditUserDialog } from './EditUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { formatDistanceToNow } from 'date-fns';
import { getRoleBadgeColor, type AppRole } from '@/lib/rbac';
import { useInvitations } from '@/hooks/useInvitations';
import { Mail, Clock } from 'lucide-react';

type SortColumn = 'name' | 'role' | 'team' | 'lastActive';
type SortDirection = 'asc' | 'desc';

// Role priority for sorting (lower number = higher priority)
const getRolePriority = (role: string): number => {
  const priorities: Record<string, number> = {
    'platform_admin': 1,
    'office_manager': 2,
    'team_leader': 3,
    'salesperson': 4,
    'assistant': 5,
  };
  return priorities[role] || 999; // Unknown roles go to end
};

export const UsersSection = () => {
  const { users, pendingInvitations, isLoading } = useOfficeTeamsUsers();
  const { resendInvitation } = useInvitations();
  const [searchQuery, setSearchQuery] = useState('');
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  const getSortIcon = useCallback((column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  }, [sortColumn, sortDirection]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const filteredInvitations = useMemo(() => {
    return pendingInvitations.filter((inv) =>
      inv.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pendingInvitations, searchQuery]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    switch (sortColumn) {
      case 'name':
        return multiplier * a.full_name.localeCompare(b.full_name);
      
      case 'role':
        // Sort by role priority first, then by role name for same priority
        const aPriority = getRolePriority(a.roles[0] || '');
        const bPriority = getRolePriority(b.roles[0] || '');
        if (aPriority !== bPriority) {
          return multiplier * (aPriority - bPriority);
        }
        // If same priority, sort alphabetically by role name
        const aRole = a.roles[0] || '';
        const bRole = b.roles[0] || '';
        return multiplier * aRole.localeCompare(bRole);
      
      case 'team':
        const aTeam = a.teamName || 'zzz'; // Solo agents go to end
        const bTeam = b.teamName || 'zzz';
        return multiplier * aTeam.localeCompare(bTeam);
      
      case 'lastActive':
        const aTime = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
        const bTime = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
        return multiplier * (aTime - bTime);
      
      default:
        return 0;
    }
    });
  }, [filteredUsers, sortColumn, sortDirection]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              All Users ({users.length})
              {pendingInvitations.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  + {pendingInvitations.length} pending
                </span>
              )}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('name')}
                    className="h-8 px-2 -ml-2 hover:bg-accent"
                  >
                    User
                    {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('role')}
                    className="h-8 px-2 -ml-2 hover:bg-accent"
                  >
                    Role
                    {getSortIcon('role')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('team')}
                    className="h-8 px-2 -ml-2 hover:bg-accent"
                  >
                    Team
                    {getSortIcon('team')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('lastActive')}
                    className="h-8 px-2 -ml-2 hover:bg-accent"
                  >
                    Last Active
                    {getSortIcon('lastActive')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvitations.map((invitation) => (
                <TableRow key={invitation.id} className="bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="opacity-60">
                        <AvatarFallback>
                          <Clock className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-muted-foreground">
                          {invitation.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Invited {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getRoleBadgeColor(invitation.role as AppRole)}`}
                    >
                      {invitation.role?.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 ml-2">
                      Pending
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">Not yet joined</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">Never</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendInvitation(invitation.id)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Reminder
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge 
                          key={role} 
                          variant="outline" 
                          className={`text-xs ${getRoleBadgeColor(role as AppRole)}`}
                        >
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.teamName || (
                      <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <span className="text-amber-600 dark:text-amber-400">👤</span>
                        Solo Agent
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.last_active_at ? (
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.last_active_at), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditUser(user)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editUser && (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
        />
      )}

      {deleteUser && (
        <DeleteUserDialog
          user={deleteUser}
          open={!!deleteUser}
          onOpenChange={(open) => !open && setDeleteUser(null)}
        />
      )}
    </>
  );
};
