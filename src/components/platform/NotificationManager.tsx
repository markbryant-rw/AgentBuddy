import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Send, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { TeamSearchCombobox } from './TeamSearchCombobox';
import { UserSearchCombobox } from './UserSearchCombobox';

type NotificationType = 'info' | 'success' | 'warning' | 'urgent';
type TargetType = 'all' | 'team' | 'office' | 'user';

interface NotificationFormData {
  title: string;
  message: string;
  type: NotificationType;
  targetType: TargetType;
  targetId?: string;
  expiresInDays?: number;
  displayAsBanner?: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export const NotificationManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    message: '',
    type: 'info',
    targetType: 'all',
    expiresInDays: 7,
    displayAsBanner: false,
    actionUrl: '',
    actionLabel: '',
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch sent notifications history
  const { data: sentNotifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, profiles:user_id(full_name, email)')
        .not('sent_by', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      const { data: result, error } = await supabase.functions.invoke('send-notification', {
        body: data,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      toast.success('Notification sent!', {
        description: `Sent to ${result.recipientCount} user${result.recipientCount !== 1 ? 's' : ''}`,
      });
      setFormData({
        title: '',
        message: '',
        type: 'info',
        targetType: 'all',
        expiresInDays: 7,
        displayAsBanner: false,
        actionUrl: '',
        actionLabel: '',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (error: any) => {
      toast.error('Failed to send notification', {
        description: error.message,
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notification deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (error: any) => {
      toast.error('Failed to delete notification', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    let targetId = formData.targetId;
    if (formData.targetType === 'team' && selectedTeamId) {
      targetId = selectedTeamId;
    } else if (formData.targetType === 'user' && selectedUserId) {
      targetId = selectedUserId;
    }

    if ((formData.targetType === 'team' || formData.targetType === 'office' || formData.targetType === 'user') && !targetId) {
      toast.error('Please select a target');
      return;
    }

    sendNotificationMutation.mutate({ ...formData, targetId });
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'info': return <Info className="h-4 w-4" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'urgent': return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: NotificationType) => {
    switch (type) {
      case 'info': return 'default';
      case 'success': return 'default';
      case 'warning': return 'outline';
      case 'urgent': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Notification Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Send Notification</CardTitle>
          </div>
          <CardDescription>
            Push notifications to users across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="New Feature Available!"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: NotificationType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="We've just launched a new module that will help you..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.message.length}/500 characters
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetType">Send To</Label>
                <Select
                  value={formData.targetType}
                  onValueChange={(value: TargetType) => {
                    setFormData({ ...formData, targetType: value, targetId: undefined });
                    setSelectedTeamId(null);
                    setSelectedUserId(null);
                  }}
                >
                  <SelectTrigger id="targetType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="team">Specific Team</SelectItem>
                    <SelectItem value="office">Specific Office</SelectItem>
                    <SelectItem value="user">Individual User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.targetType === 'team' && (
                <div className="space-y-2">
                  <Label>Select Team</Label>
                  <TeamSearchCombobox
                    value={selectedTeamId}
                    onValueChange={setSelectedTeamId}
                  />
                </div>
              )}

              {formData.targetType === 'user' && (
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <UserSearchCombobox
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="expires">Expires In (Days)</Label>
                <Input
                  id="expires"
                  type="number"
                  min={1}
                  max={90}
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 7 })}
                />
              </div>
            </div>

            {/* Banner Display Option */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="displayAsBanner"
                  checked={formData.displayAsBanner}
                  onCheckedChange={(checked) => setFormData({ ...formData, displayAsBanner: checked as boolean })}
                />
                <div className="space-y-1">
                  <Label htmlFor="displayAsBanner" className="text-sm font-medium cursor-pointer">
                    Display as banner notification
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    High-priority notifications appear prominently at the top of the dashboard
                  </p>
                </div>
              </div>

              {formData.displayAsBanner && (
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="actionUrl">Action URL (optional)</Label>
                    <Input
                      id="actionUrl"
                      value={formData.actionUrl}
                      onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                      placeholder="/path-to-feature"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="actionLabel">Action Label (optional)</Label>
                    <Input
                      id="actionLabel"
                      value={formData.actionLabel}
                      onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
                      placeholder="Learn More"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm font-medium mb-2">Preview</p>
              <div className="bg-background border rounded-md p-3 space-y-1">
                <div className="flex items-center gap-2">
                  {getTypeIcon(formData.type)}
                  <p className="font-semibold text-sm">{formData.title || 'Notification Title'}</p>
                </div>
                <p className="text-sm text-muted-foreground">{formData.message || 'Notification message...'}</p>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={sendNotificationMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendNotificationMutation.isPending ? 'Sending...' : 'Send Notification'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>
            Recently sent notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sentNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications sent yet</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentNotifications.map((notification: any) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{notification.message}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(notification.type)}>
                          {notification.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {notification.target_type === 'all' ? 'All Users' : 
                         notification.target_type === 'team' ? 'Team' :
                         notification.target_type === 'office' ? 'Office' : 'Individual'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(notification.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {notification.expires_at ? format(new Date(notification.expires_at), 'MMM d') : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                          disabled={deleteNotificationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};