import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useKPITargets, KPIType } from '@/hooks/useKPITargets';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Edit2, Trash2, Save, X, Target, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TargetWizard } from './TargetWizard';

export function ManageTargets() {
  const { user } = useAuth();
  const { targets, deleteTarget, updateTarget, isDeleting, isUpdating } = useKPITargets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetToDelete, setTargetToDelete] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const kpiLabels: Record<KPIType, { label: string; icon: string }> = {
    calls: { label: 'Calls', icon: '📞' },
    sms: { label: 'SMS', icon: '💬' },
    appraisals: { label: 'Appraisals', icon: '🏡' },
    open_homes: { label: 'Open Homes', icon: '🗝️' },
    listings: { label: 'Listings', icon: '✍️' },
    sales: { label: 'Sales', icon: '🎉' },
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90) return <Badge variant="default" className="bg-green-600">On Track</Badge>;
    if (percentage >= 60) return <Badge variant="default" className="bg-orange-600">Behind</Badge>;
    return <Badge variant="destructive">At Risk</Badge>;
  };

  const handleEdit = (targetId: string, currentValue: number) => {
    setEditingId(targetId);
    setEditValue(currentValue);
  };

  const handleSave = (targetId: string) => {
    updateTarget({
      targetId,
      updates: { target_value: editValue },
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue(0);
  };

  const handleDeleteClick = (targetId: string) => {
    setTargetToDelete(targetId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (targetToDelete) {
      deleteTarget(targetToDelete);
      setDeleteDialogOpen(false);
      setTargetToDelete(null);
    }
  };

  // Group targets by period type
  const weeklyTargets = targets.filter(t => t.period_type === 'weekly');
  const monthlyTargets = targets.filter(t => t.period_type === 'monthly');
  const dailyTargets = targets.filter(t => t.period_type === 'daily');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Manage Targets
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and adjust your performance targets
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          + Create New Targets
        </Button>
      </div>

      {/* Current Targets Overview */}
      {targets.length > 0 ? (
        <>
          {/* Weekly Targets */}
          {weeklyTargets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Weekly Targets
              </h3>
              <div className="grid gap-3">
                {weeklyTargets.map((target) => (
                  <Card key={target.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">{kpiLabels[target.kpi_type as KPIType]?.icon}</span>
                          <div className="flex-1">
                            <h4 className="font-semibold">
                              {kpiLabels[target.kpi_type as KPIType]?.label || target.kpi_type}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(target.start_date), 'MMM d')} - {format(new Date(target.end_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          {getStatusBadge(50)} {/* TODO: Calculate actual progress */}
                        </div>

                        {editingId === target.id ? (
                          <div className="flex items-center gap-2 mb-3">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                              className="w-24"
                              autoFocus
                            />
                            <Button size="sm" onClick={() => handleSave(target.id)} disabled={isUpdating}>
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Target:</span>
                              <span className="font-bold">{target.target_value}</span>
                            </div>
                            <Progress value={50} className="h-2" /> {/* TODO: Calculate actual progress */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>0 / {target.target_value}</span>
                              <span>50%</span> {/* TODO: Calculate actual progress */}
                            </div>
                          </div>
                        )}

                        {target.admin_notes && (
                          <p className="text-xs text-muted-foreground italic mt-2">
                            Note: {target.admin_notes}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1 ml-4">
                        {editingId !== target.id && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(target.id, target.target_value)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteClick(target.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Targets */}
          {monthlyTargets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Monthly Targets
              </h3>
              <div className="grid gap-3">
                {monthlyTargets.map((target) => (
                  <Card key={target.id} className="p-4">
                    {/* Similar structure to weekly targets */}
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{kpiLabels[target.kpi_type as KPIType]?.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold">
                          {kpiLabels[target.kpi_type as KPIType]?.label}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Target: {target.target_value}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Business Plan Integration Placeholder */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">Business Plan Integration</h3>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your quarterly business plan to automatically populate targets and track progress toward annual goals.
                </p>
                <Button variant="secondary" disabled>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Use Q1/Q2/Q3 Targets
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No targets set yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first targets to start tracking your performance
          </p>
          <Button onClick={() => setWizardOpen(true)}>
            🎯 Create Your First Target
          </Button>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this target. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Target Wizard */}
      <TargetWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
