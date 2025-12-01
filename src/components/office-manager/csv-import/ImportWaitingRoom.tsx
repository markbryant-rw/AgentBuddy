import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, AlertCircle, AlertTriangle, ChevronDown, Edit, Trash2 } from 'lucide-react';
import type { ParsedUser } from '@/hooks/useUserImport';
import { BulkInviteControls } from './BulkInviteControls';
import { useState } from 'react';
import { EditImportUserDialog } from './EditImportUserDialog';

interface ImportWaitingRoomProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: ParsedUser[];
  stats: {
    total: number;
    valid: number;
    withWarnings: number;
    withErrors: number;
    selected: number;
  };
  onToggleSelection: (id: string) => void;
  onSelectAll: (validOnly: boolean) => void;
  onDeselectAll: () => void;
  onRemoveUser: (id: string) => void;
  onEditUser: (id: string, updates: Partial<ParsedUser>) => void;
  onInvite: (users: ParsedUser[]) => Promise<void>;
  isInviting: boolean;
}

export function ImportWaitingRoom({
  open,
  onOpenChange,
  users,
  stats,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onRemoveUser,
  onEditUser,
  onInvite,
  isInviting,
}: ImportWaitingRoomProps) {
  const [editingUser, setEditingUser] = useState<ParsedUser | null>(null);

  const getStatusBadge = (user: ParsedUser) => {
    if (!user.isValid) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          {user.errors.length} Error{user.errors.length !== 1 ? 's' : ''}
        </Badge>
      );
    }
    if (user.warnings.length > 0) {
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-500">
          <AlertTriangle className="h-3 w-3" />
          {user.warnings.length} Warning{user.warnings.length !== 1 ? 's' : ''}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-500">
        <CheckCircle2 className="h-3 w-3" />
        Valid
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Review & Import Users</DialogTitle>
            <DialogDescription>
              Review the parsed users below and select which ones to invite
            </DialogDescription>
          </DialogHeader>

          {/* Stats Summary */}
          <div className="grid grid-cols-5 gap-4">
            <Alert>
              <AlertDescription>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertDescription>
                <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
                <div className="text-xs text-muted-foreground">Valid</div>
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertDescription>
                <div className="text-2xl font-bold text-yellow-600">{stats.withWarnings}</div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertDescription>
                <div className="text-2xl font-bold text-red-600">{stats.withErrors}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertDescription>
                <div className="text-2xl font-bold text-primary">{stats.selected}</div>
                <div className="text-xs text-muted-foreground">Selected</div>
              </AlertDescription>
            </Alert>
          </div>

          {/* User Table */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={stats.selected === stats.total && stats.total > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onSelectAll(false);
                        } else {
                          onDeselectAll();
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <Collapsible key={user.id} asChild>
                    <>
                      <TableRow>
                        <TableCell>
                          <Checkbox
                            checked={user.isSelected}
                            onCheckedChange={() => onToggleSelection(user.id)}
                            disabled={!user.isValid}
                          />
                        </TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell>{user.first_name} {user.last_name}</TableCell>
                        <TableCell className="font-mono text-xs">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.validatedRole || user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{user.team_name || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{user.normalizedMobile || user.mobile || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onRemoveUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {(user.errors.length > 0 || user.warnings.length > 0) && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {(user.errors.length > 0 || user.warnings.length > 0) && (
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/50">
                              <div className="space-y-2 py-2">
                                {user.errors.map((error, idx) => (
                                  <Alert key={idx} variant="destructive" className="py-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                      <strong>{error.field}:</strong> {error.message}
                                    </AlertDescription>
                                  </Alert>
                                ))}
                                {user.warnings.map((warning, idx) => (
                                  <Alert key={idx} className="py-2 border-yellow-500/50">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    <AlertDescription className="text-xs">
                                      <strong>{warning.field}:</strong> {warning.message}
                                    </AlertDescription>
                                  </Alert>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      )}
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Bulk Invite Controls */}
          <BulkInviteControls
            users={users}
            stats={stats}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
            onInvite={onInvite}
            isInviting={isInviting}
          />
        </DialogContent>
      </Dialog>

      {editingUser && (
        <EditImportUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          onSave={(updates) => {
            onEditUser(editingUser.id, updates);
            setEditingUser(null);
          }}
        />
      )}
    </>
  );
}
