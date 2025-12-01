import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Module, useModulePolicies } from '@/hooks/useModulePolicies';

interface EditModuleDialogProps {
  module: Module;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditModuleDialog = ({ module, open, onOpenChange }: EditModuleDialogProps) => {
  const { updateModule } = useModulePolicies();
  const [formData, setFormData] = useState({
    title: module.title,
    description: module.description || '',
    category: module.category,
    icon: module.icon || '',
    default_policy: module.default_policy,
    sort_order: module.sort_order,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateModule.mutate(
      { id: module.id, updates: formData },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const isSystemModule = module.is_system;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Module: {module.title}</DialogTitle>
          <DialogDescription>
            Update module metadata and settings
          </DialogDescription>
        </DialogHeader>

        {isSystemModule && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This is a system module and cannot be edited. System modules are core to the platform.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isSystemModule}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isSystemModule}
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/200 characters
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={isSystemModule}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="ai-tools">AI Tools</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="tools">Tools</SelectItem>
                  <SelectItem value="coming-soon">Coming Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon (Lucide name)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                disabled={isSystemModule}
                placeholder="e.g., MessageSquare"
              />
              <p className="text-xs text-muted-foreground">
                Use Lucide icon names
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_policy">Default Policy *</Label>
              <Select
                value={formData.default_policy}
                onValueChange={(value) => setFormData({ ...formData, default_policy: value })}
                disabled={isSystemModule}
              >
                <SelectTrigger id="default_policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Applies when no specific policy exists
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                disabled={isSystemModule}
                min={0}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSystemModule || updateModule.isPending}>
              {updateModule.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
