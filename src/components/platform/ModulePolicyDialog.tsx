import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ModulePolicy } from '@/hooks/useModulePolicies';

interface ModulePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  moduleTitle: string;
  scopeType: 'global' | 'office' | 'team' | 'user';
  scopeId: string | null;
  currentPolicy?: ModulePolicy;
  onSave: (policy: Omit<ModulePolicy, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => void;
}

export const ModulePolicyDialog = ({
  open,
  onOpenChange,
  moduleId,
  moduleTitle,
  scopeType,
  scopeId,
  currentPolicy,
  onSave,
}: ModulePolicyDialogProps) => {
  const [policy, setPolicy] = useState<'enabled' | 'locked' | 'hidden' | 'trial' | 'premium_required'>(
    currentPolicy?.policy || 'enabled'
  );
  const [reason, setReason] = useState(currentPolicy?.reason || '');
  const [expiresAt, setExpiresAt] = useState(
    currentPolicy?.expires_at ? new Date(currentPolicy.expires_at).toISOString().slice(0, 16) : ''
  );

  const handleSave = () => {
    onSave({
      module_id: moduleId,
      scope_type: scopeType,
      scope_id: scopeId,
      policy,
      reason: reason || null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Module Policy</DialogTitle>
          <DialogDescription>
            Update access policy for <span className="font-semibold">{moduleTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="policy">Policy</Label>
            <Select value={policy} onValueChange={(v: any) => setPolicy(v)}>
              <SelectTrigger id="policy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Enabled - Full access
                  </div>
                </SelectItem>
                <SelectItem value="locked">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    Locked - Visible but disabled
                  </div>
                </SelectItem>
                <SelectItem value="hidden">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-500" />
                    Hidden - Completely hidden
                  </div>
                </SelectItem>
                <SelectItem value="trial">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Trial - Temporary access
                  </div>
                </SelectItem>
                <SelectItem value="premium_required">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    Premium Required - Billing gate
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why is this policy being applied?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {(policy === 'trial' || policy === 'premium_required') && (
            <div className="space-y-2">
              <Label htmlFor="expires">Expires At (optional)</Label>
              <Input
                id="expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent policy
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};