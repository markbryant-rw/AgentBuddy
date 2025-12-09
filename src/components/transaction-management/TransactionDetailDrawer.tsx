import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, MapPin, DollarSign, Users, CheckSquare, FileText, MessageSquare, ArrowRight, X, Pencil, Plus, Trash2, RefreshCw, ClipboardList, XCircle, AlertTriangle } from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import type { Transaction, TransactionStage } from '@/hooks/useTransactions';
import type { VendorName, BuyerName } from '@/types/transaction';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { EditTransactionDialog } from './EditTransactionDialog';
import { ExtendListingDialog } from './ExtendListingDialog';
import { calculateDaysOnMarket, calculateDaysUntilExpiry, getExpiryStatus } from '@/lib/listingExpiryUtils';
import { TransactionNotesTab } from './TransactionNotesTab';
import { TransactionSettingsTab } from './TransactionSettingsTab';
import { TransactionTasksTab } from './TransactionTasksTab';
import { TransactionLinksSection } from './TransactionLinksSection';
import { TransactionVendorReportsTab } from './TransactionVendorReportsTab';
import { TransactionDocumentsTab } from './TransactionDocumentsTab';
import { useTransactionDocuments } from '@/hooks/useTransactionDocuments';
import { PriceAlignmentIndicator } from './PriceAlignmentIndicator';
import { InlineEditablePrice } from './InlineEditablePrice';
import type { TransactionLink } from '@/hooks/useTransactions';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StageTransitionDialog } from './StageTransitionDialog';
import { DealCollapseDialog } from './DealCollapseDialog';
import { DealHistorySection } from './DealHistorySection';
import { isForwardTransition, isBackwardTransition } from '@/lib/stageTransitionConfig';
import { WithdrawPropertyDialog } from './WithdrawPropertyDialog';
import { TaskRolloverDialog } from './TaskRolloverDialog';
import { useTaskRollover } from '@/hooks/useTaskRollover';

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange?: (transactionId: string, newStage: TransactionStage) => void;
  onEdit?: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const STAGE_CONFIG: Record<TransactionStage, { label: string; color: string; next?: TransactionStage }> = {
  signed: { label: '01. Signed', color: 'bg-rose-500', next: 'live' },
  live: { label: '02. Live', color: 'bg-indigo-500', next: 'contract' },
  contract: { label: '03. Under Contract', color: 'bg-amber-500', next: 'unconditional' },
  unconditional: { label: '04. Unconditional', color: 'bg-teal-500', next: 'settled' },
  settled: { label: '05. Settled', color: 'bg-gray-400' },
};

export const TransactionDetailDrawer = ({
  transaction,
  open,
  onOpenChange,
  onStageChange,
  onEdit,
  onDelete,
}: TransactionDetailDrawerProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [stageTransitionDialogOpen, setStageTransitionDialogOpen] = useState(false);
  const [dealCollapseDialogOpen, setDealCollapseDialogOpen] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState<TransactionStage | null>(null);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [taskRolloverDialogOpen, setTaskRolloverDialogOpen] = useState(false);
  const [incompleteTaskCount, setIncompleteTaskCount] = useState(0);
  
  const { getIncompleteTasksForTransaction } = useTaskRollover();

  // Fetch actual task counts including overdue
  const { data: taskCounts } = useQuery({
    queryKey: ['transaction-tasks-count', transaction?.id],
    queryFn: async () => {
      if (!transaction?.id) return { done: 0, total: 0, overdue: 0 };
      const { data, error } = await supabase
        .from('tasks')
        .select('id, completed, due_date')
        .eq('transaction_id', transaction.id)
        .is('list_id', null)
        .is('project_id', null);
      
      if (error) throw error;
      const today = new Date().toISOString().split('T')[0];
      const total = data?.length || 0;
      const done = data?.filter(t => t.completed).length || 0;
      const overdue = data?.filter(t => !t.completed && t.due_date && t.due_date < today).length || 0;
      return { done, total, overdue };
    },
    enabled: !!transaction?.id,
  });

  // Get document counts
  const { documents } = useTransactionDocuments(transaction?.id);
  const docCounts = useMemo(() => ({
    total: documents.length,
    reviewed: documents.filter(d => d.status === 'reviewed').length,
    pendingRequired: documents.filter(d => d.status === 'pending' && d.required).length,
  }), [documents]);

  if (!transaction) return null;

  const currentStage = STAGE_CONFIG[transaction.stage];
  const nextStage = currentStage.next ? STAGE_CONFIG[currentStage.next] : null;

  const handlePriceUpdate = async (field: 'vendor_price' | 'team_price', value: number) => {
    if (!transaction) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ [field]: value })
        .eq('id', transaction.id);

      if (error) throw error;

      toast.success(`${field === 'vendor_price' ? 'Vendor' : 'Team'} price updated`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update price');
      throw error;
    }
  };

  const handleMoveStage = async () => {
    if (!nextStage) return;
    
    const targetStage = currentStage.next!;
    
    // Check if forward transition - need to check for incomplete tasks
    if (isForwardTransition(transaction.stage, targetStage)) {
      try {
        // Check for incomplete tasks first
        const incompleteTasks = await getIncompleteTasksForTransaction(transaction.id);
        
        if (incompleteTasks.length > 0) {
          // Show task rollover dialog first
          setIncompleteTaskCount(incompleteTasks.length);
          setPendingStageChange(targetStage);
          setTaskRolloverDialogOpen(true);
        } else {
          // No incomplete tasks, proceed directly to stage transition
          setPendingStageChange(targetStage);
          setStageTransitionDialogOpen(true);
        }
      } catch (error) {
        console.error('Error checking incomplete tasks:', error);
        // On error, proceed without rollover check
        setPendingStageChange(targetStage);
        setStageTransitionDialogOpen(true);
      }
    } else if (isBackwardTransition(transaction.stage, targetStage)) {
      // Open deal collapse dialog
      setPendingStageChange(targetStage);
      setDealCollapseDialogOpen(true);
    } else {
      // Direct stage change (shouldn't happen)
      onStageChange?.(transaction.id, targetStage);
    }
  };

  const handleTaskRolloverComplete = () => {
    setTaskRolloverDialogOpen(false);
    // After task rollover choice is made, proceed to stage transition dialog
    setStageTransitionDialogOpen(true);
  };

  const handleStageTransitionConfirm = async (updates: Partial<Transaction>) => {
    if (!pendingStageChange || !onEdit) return;
    
    try {
      await onEdit(transaction.id, updates);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Trigger notification for unconditional
      if (pendingStageChange === 'unconditional') {
        try {
          await supabase.functions.invoke('notify-team-transaction', {
            body: {
              transactionId: transaction.id,
              eventType: 'moved_to_unconditional',
              transactionAddress: transaction.address,
              teamId: transaction.team_id,
            },
          });
        } catch (notifyError) {
          console.error('Failed to send team notification', notifyError);
        }
      }
      
      // Close the drawer after successful stage transition
      setStageTransitionDialogOpen(false);
      onOpenChange(false);
    } finally {
      setPendingStageChange(null);
    }
  };

  const handleDealCollapseConfirm = async (updates: Partial<Transaction>, dealHistory: any) => {
    if (!onEdit) return;
    
    try {
      await onEdit(transaction.id, updates);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } finally {
      setPendingStageChange(null);
    }
  };

  const handleExtendListing = async (newExpiryDate: string) => {
    if (!transaction || !onEdit) return;
    
    try {
      await onEdit(transaction.id, {
        listing_expires_date: newExpiryDate,
      });
      
      setShowExtendDialog(false);
      
      toast.success('Listing Extended', {
        description: `Agency agreement extended to ${format(new Date(newExpiryDate), 'dd MMM yyyy')}`,
      });
    } catch (error) {
      console.error('Error extending listing:', error);
      toast.error('Failed to extend listing agreement');
    }
  };

  const handleWithdrawProperty = async (withdrawalReason?: string) => {
    if (!transaction || !onEdit) return;
    
    try {
      // Archive the transaction
      await onEdit(transaction.id, { archived: true });
      
      // Create past sales entry with 'withdrawn' status
      const { error: pastSalesError } = await supabase
        .from('past_sales')
        .insert({
          address: transaction.address,
          sale_price: 0,
          sale_date: new Date().toISOString().split('T')[0],
          team_id: transaction.team_id,
          agent_id: user?.id || transaction.created_by,
          notes: `Withdrawn: ${withdrawalReason}`,
        });
        
      if (pastSalesError) {
        console.error('Failed to create past sales entry:', pastSalesError);
        toast.error('Failed to move property to Past Sales. Please try again.');
        return;
      }
      
      toast.success('Property Withdrawn', {
        description: 'Property has been moved to Past Sales History as withdrawn',
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to withdraw property');
    }
  };

  const validateTransactionForCompletion = (transaction: Transaction) => {
    const missingFields: string[] = [];
    
    if (transaction.stage !== 'settled') {
      missingFields.push('Stage must be "Settled"');
    }
    
    if (!transaction.settlement_date) {
      missingFields.push('Settlement Date');
    }
    
  if (!transaction.sale_price) {
      missingFields.push('Sale Price');
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  const calculateDaysOnMarket = (liveDate?: string, settlementDate?: string): number | null => {
    if (!liveDate || !settlementDate) return null;
    const live = new Date(liveDate);
    const settled = new Date(settlementDate);
    const diffTime = Math.abs(settled.getTime() - live.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const mapVendorDetails = (vendorNames?: VendorName[]): any => {
    if (!vendorNames || vendorNames.length === 0) return {};
    
    const vendorDetails: any = {};
    
    if (vendorNames[0]) {
      vendorDetails.primary = {
        first_name: vendorNames[0].first_name,
        last_name: vendorNames[0].last_name,
      };
    }
    
    if (vendorNames[1]) {
      vendorDetails.secondary = {
        first_name: vendorNames[1].first_name,
        last_name: vendorNames[1].last_name,
      };
    }
    
    return vendorDetails;
  };

  const mapBuyerDetails = (buyerNames?: BuyerName[]): any => {
    if (!buyerNames || buyerNames.length === 0) return {};
    
    if (buyerNames[0]) {
      return {
        first_name: buyerNames[0].first_name,
        last_name: buyerNames[0].last_name,
      };
    }
    
    return {};
  };

  const handleComplete = async () => {
    if (!transaction || !onEdit) return;
    
    // Validate first
    const validation = validateTransactionForCompletion(transaction);
    
    if (!validation.isValid) {
      setValidationErrors(validation.missingFields);
      setShowValidationAlert(true);
      return;
    }
    
    try {
      // Archive the transaction
      await onEdit(transaction.id, { archived: true });
      
      // Create past sales entry (we know it's valid now)
      const { error: pastSalesError } = await supabase
        .from('past_sales')
        .insert({
          address: transaction.address,
          sale_price: transaction.team_price || transaction.vendor_price || 0,
          sale_date: transaction.settlement_date || new Date().toISOString().split('T')[0],
          team_id: transaction.team_id,
          agent_id: user?.id || transaction.created_by,
          commission: transaction.team_price ? (transaction.team_price * 0.02) : undefined,
          notes: `Lead source: ${transaction.lead_source || 'Unknown'}`,
        });
        
      if (pastSalesError) {
        console.error('Failed to create past sales entry:', pastSalesError);
        toast.error('Failed to create past sales entry. Please try again.');
        return;
      }
      
      toast.success('Transaction completed and added to Past Sales');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete transaction');
    }
  };

  const handleRestore = async () => {
    if (!transaction || !onEdit) return;
    
    try {
      await onEdit(transaction.id, { archived: false });
      toast.success('Transaction restored to active');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore transaction');
    }
  };

  const taskProgress = (taskCounts?.total || 0) > 0
    ? Math.round(((taskCounts?.done || 0) / taskCounts!.total) * 100)
    : 0;
    
  const docProgress = docCounts.total > 0
    ? Math.round((docCounts.reviewed / docCounts.total) * 100)
    : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={cn('text-white border-0', currentStage.color)}>
                    {currentStage.label}
                  </Badge>
                  {transaction.warmth === 'on_hold' && (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                      On Hold
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-2xl">{transaction.address}</SheetTitle>
                {transaction.suburb && (
                  <p className="text-sm text-muted-foreground mt-1">{transaction.suburb}</p>
                )}
              </div>
              <div className="flex gap-2 mr-8">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditDialogOpen(true)}
                    className="gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete <strong>{transaction.address}</strong>? 
                          This action cannot be undone and will permanently remove all associated tasks, 
                          comments, and data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await onDelete(transaction.id);
                            onOpenChange(false);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Transaction
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {transaction.archived ? (
              <Button 
                onClick={handleRestore} 
                variant="outline" 
                className="w-full mt-4 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Restore Transaction
              </Button>
            ) : (
              <>
                {nextStage && (
                  <Button onClick={handleMoveStage} className="w-full mt-4">
                    Move to {nextStage.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                
                {/* Complete Button - Show when in settled stage or all tasks done */}
                {(transaction.stage === 'settled' || 
                  (transaction.tasks_total > 0 && transaction.tasks_done === transaction.tasks_total)) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full mt-2 border-green-600 text-green-600 hover:bg-green-50"
                      >
                        <CheckSquare className="mr-2 h-4 w-4" />
                        Mark as Complete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {transaction.tasks_done < transaction.tasks_total 
                            ? '⚠️ Outstanding Tasks' 
                            : 'Mark Transaction as Complete?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {transaction.tasks_done < transaction.tasks_total ? (
                            <>
                              <div className="font-semibold text-amber-600 mb-2">
                                There are {transaction.tasks_total - transaction.tasks_done} task(s) still outstanding.
                              </div>
                              <div className="mb-2">
                                Completing this transaction will archive <strong>{transaction.address}</strong> and 
                                remove it from your active transactions, even with incomplete tasks.
                              </div>
                              <div className="text-sm">
                                Are you sure you want to proceed?
                              </div>
                            </>
                          ) : (
                            <>
                              This will archive <strong>{transaction.address}</strong> and remove it from your 
                              active transactions. You can still search for and view completed transactions later.
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleComplete}
                          className={transaction.tasks_done < transaction.tasks_total 
                            ? 'bg-amber-600 hover:bg-amber-700' 
                            : 'bg-green-600 hover:bg-green-700'}
                        >
                          {transaction.tasks_done < transaction.tasks_total 
                            ? 'Complete Anyway' 
                            : 'Mark as Complete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </SheetHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start px-6 pt-2 pb-0 h-auto bg-transparent border-b rounded-none">
              <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <FileText className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <CheckSquare className="h-4 w-4 mr-2" />
                Tasks ({taskCounts?.done || 0}/{taskCounts?.total || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="documents" 
                className={cn(
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none",
                  docCounts.pendingRequired > 0 && "text-amber-600 dark:text-amber-400"
                )}
              >
                <FileText className="h-4 w-4 mr-2" />
                Documents ({docCounts.reviewed}/{docCounts.total})
                {docCounts.pendingRequired > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs rounded-full">
                    {docCounts.pendingRequired}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <ClipboardList className="h-4 w-4 mr-2" />
                Vendor Reports
              </TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <MessageSquare className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="p-6 space-y-6 mt-0">
                {/* Progress Section - Tasks & Documents */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  {/* Task Progress */}
                  <div className="flex flex-col items-center gap-2">
                    <ProgressRing progress={taskProgress} size={72} strokeWidth={6} />
                    <div className="text-center">
                      <p className="text-sm font-medium flex items-center justify-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5" />
                        Tasks
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {taskCounts?.done || 0} of {taskCounts?.total || 0} complete
                      </p>
                      {(taskCounts?.overdue || 0) > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          {taskCounts!.overdue} overdue
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Document Progress */}
                  <div className="flex flex-col items-center gap-2">
                    <ProgressRing progress={docProgress} size={72} strokeWidth={6} />
                    <div className="text-center">
                      <p className="text-sm font-medium flex items-center justify-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        Documents
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {docCounts.reviewed} of {docCounts.total} reviewed
                      </p>
                      {docCounts.pendingRequired > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          {docCounts.pendingRequired} pending required
                        </p>
                      )}
                    </div>
                  </div>
                </div>

              {/* Client Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Client Details
                  </h3>
                  {onEdit && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setEditDialogOpen(true)}
                      className="h-7 px-2 text-xs"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit Details
                    </Button>
                  )}
                </div>
                  <div className="space-y-3">
                    {/* Client Name with Avatar */}
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {transaction.client_name?.charAt(0) || 'V'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{transaction.client_name}</p>
                        <p className="text-sm text-muted-foreground">Vendor</p>
                      </div>
                    </div>

                    {/* Additional Client Information */}
                    <div className="grid gap-2 text-sm">
                      {transaction.client_email && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email</span>
                          <span className="font-medium">{transaction.client_email}</span>
                        </div>
                      )}
                      {transaction.client_phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone</span>
                          <span className="font-medium">{transaction.client_phone}</span>
                        </div>
                      )}
                      {transaction.lead_source && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lead Source</span>
                          <span className="font-medium capitalize">{transaction.lead_source.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Pricing Information */}
                    <div className="space-y-4 pt-2 border-t">
                      <InlineEditablePrice
                        label="Vendor Price"
                        value={transaction.vendor_price}
                        onSave={(value) => handlePriceUpdate('vendor_price', value)}
                      />
                      <InlineEditablePrice
                        label="Team Price"
                        value={transaction.team_price}
                        onSave={(value) => handlePriceUpdate('team_price', value)}
                      />
                      {transaction.vendor_price && transaction.team_price && (
                        <div className="pt-2">
                          <PriceAlignmentIndicator 
                            vendorPrice={transaction.vendor_price}
                            teamPrice={transaction.team_price}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Links Section */}
                <TransactionLinksSection
                  links={transaction.links || []}
                  onAddLink={async (link: TransactionLink) => {
                    if (onEdit) {
                      await onEdit(transaction.id, {
                        links: [...(transaction.links || []), link]
                      });
                    }
                  }}
                  onDeleteLink={async (linkId: string) => {
                    if (onEdit) {
                      await onEdit(transaction.id, {
                        links: (transaction.links || []).filter(l => l.id !== linkId)
                      });
                    }
                  }}
                />

                {/* Key Dates - Stage Specific */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Key Dates
                    </h3>
                    {onEdit && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditDialogOpen(true)}
                        className="h-7 px-2 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Dates
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {/* Signed Stage Dates */}
                    {transaction.stage === 'signed' && (
                      <>
                        {transaction.listing_signed_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Listing Signed</span>
                            <span className="font-medium">{format(new Date(transaction.listing_signed_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {transaction.photoshoot_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Photoshoot</span>
                            <span className="font-medium">{format(new Date(transaction.photoshoot_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {transaction.building_report_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Building Report</span>
                            <span className="font-medium">{format(new Date(transaction.building_report_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {transaction.live_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Listing LIVE</span>
                            <span className="font-medium">{format(new Date(transaction.live_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Live Stage Dates */}
                    {transaction.stage === 'live' && (
                      <>
                        {transaction.live_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Listing LIVE</span>
                            <span className="font-medium">{format(new Date(transaction.live_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {transaction.auction_deadline_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Auction/Deadline</span>
                            <span className="font-medium">{format(new Date(transaction.auction_deadline_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {transaction.listing_expires_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Listing Expires</span>
                            <span className="font-medium">{format(new Date(transaction.listing_expires_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Contract Stage Dates */}
                    {transaction.stage === 'contract' && (
                      <>
                        {transaction.contract_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Under Contract</span>
                            <span className="font-medium">{format(new Date(transaction.contract_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {transaction.unconditional_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Unconditional</span>
                            <span className="font-medium">{format(new Date(transaction.unconditional_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Unconditional Stage Dates */}
                    {transaction.stage === 'unconditional' && (
                      <>
                        {transaction.pre_settlement_inspection_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Pre-Settlement Inspection</span>
                            <span className="font-medium">{format(new Date(transaction.pre_settlement_inspection_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {transaction.settlement_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Settlement</span>
                            <span className="font-medium">{format(new Date(transaction.settlement_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Settled Stage Dates */}
                    {transaction.stage === 'settled' && transaction.settlement_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Settlement</span>
                        <span className="font-medium">{format(new Date(transaction.settlement_date), 'dd MMM yyyy')}</span>
                      </div>
                    )}

                    {/* Expected Settlement (shown for all stages if available) */}
                    {transaction.expected_settlement && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expected Settlement</span>
                        <span className="font-medium">{format(new Date(transaction.expected_settlement), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agency Agreement Management */}
                {(transaction.stage === 'live' || transaction.stage === 'signed') && (
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Agency Agreement
                    </h3>
                    <div className="space-y-2 p-3 bg-muted rounded-lg">
                      {transaction.listing_expires_date && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Expiry Date:</span>
                          <span className="text-sm font-medium">
                            {format(new Date(transaction.listing_expires_date), 'dd MMM yyyy')}
                          </span>
                        </div>
                      )}
                      {(() => {
                        const daysUntilExpiry = calculateDaysUntilExpiry(transaction.listing_expires_date);
                        const expiryInfo = getExpiryStatus(daysUntilExpiry);
                        return (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Days Until Expiry:</span>
                            <Badge variant={expiryInfo.variant} className="text-xs">
                              {daysUntilExpiry !== null ? `${daysUntilExpiry} days` : 'Not set'}
                            </Badge>
                          </div>
                        );
                      })()}
                      {(() => {
                        const dom = calculateDaysOnMarket(transaction.live_date);
                        return dom !== null ? (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Days on Market:</span>
                            <span className={cn("text-sm font-medium", dom >= 70 && "text-destructive")}>
                              {dom} days
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowExtendDialog(true)}
                    >
                      Extend Listing Agreement
                    </Button>
                    
                    {/* Withdraw Property Button */}
                    <div className="border-t pt-4 mt-4">
                      <Button
                        variant="outline"
                        className="w-full border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                        onClick={() => setShowWithdrawDialog(true)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Withdraw Property
                      </Button>
                    </div>
                  </div>
                )}

                {/* Team Members */}
                {transaction.assignees && Array.isArray(transaction.assignees) && transaction.assignees.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team Members
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {transaction.assignees.map((assignee: any, index: number) => (
                        <Badge key={`${assignee.role || 'member'}-${index}`} variant="secondary">
                          {assignee.role || 'Team Member'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deal History */}
                {transaction.deal_history && transaction.deal_history.length > 0 && (
                  <DealHistorySection dealHistory={transaction.deal_history} />
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0 h-full">
                <TransactionTasksTab 
                  transaction={transaction}
                  onTasksUpdate={() => {
                    queryClient.invalidateQueries({ queryKey: ['transactions'] });
                  }}
                />
              </TabsContent>

              <TabsContent value="notes" className="mt-0">
                <TransactionNotesTab transactionId={transaction.id} />
              </TabsContent>

              <TabsContent value="documents" className="mt-0 h-full">
                <TransactionDocumentsTab transactionId={transaction.id} />
              </TabsContent>

              <TabsContent value="reports" className="mt-0">
                <TransactionVendorReportsTab transactionId={transaction.id} />
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <TransactionSettingsTab transaction={transaction} />
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Extend Listing Dialog */}
      {transaction && (
        <ExtendListingDialog
          open={showExtendDialog}
          onOpenChange={setShowExtendDialog}
          currentExpiryDate={transaction.listing_expires_date}
          propertyAddress={transaction.address}
          onConfirm={handleExtendListing}
        />
      )}

      {/* Withdraw Property Dialog */}
      {transaction && (
        <WithdrawPropertyDialog
          open={showWithdrawDialog}
          onOpenChange={setShowWithdrawDialog}
          transaction={transaction}
          onConfirm={handleWithdrawProperty}
        />
      )}

      {/* Stage Transition Dialog */}
      {pendingStageChange && (
        <StageTransitionDialog
          transaction={transaction}
          targetStage={pendingStageChange}
          isOpen={stageTransitionDialogOpen}
          onClose={() => {
            setStageTransitionDialogOpen(false);
            setPendingStageChange(null);
          }}
          onConfirm={handleStageTransitionConfirm}
        />
      )}

      {/* Deal Collapse Dialog */}
      {pendingStageChange && (
        <DealCollapseDialog
          transaction={transaction}
          targetStage={pendingStageChange}
          isOpen={dealCollapseDialogOpen}
          onClose={() => {
            setDealCollapseDialogOpen(false);
            setPendingStageChange(null);
          }}
          onConfirm={handleDealCollapseConfirm}
        />
      )}

      {/* Task Rollover Dialog */}
      {pendingStageChange && (
        <TaskRolloverDialog
          isOpen={taskRolloverDialogOpen}
          onClose={() => {
            setTaskRolloverDialogOpen(false);
            setPendingStageChange(null);
          }}
          onComplete={handleTaskRolloverComplete}
          transactionId={transaction.id}
          currentStage={transaction.stage}
          targetStage={pendingStageChange}
        />
      )}

      {/* Validation Alert Dialog */}
      <AlertDialog open={showValidationAlert} onOpenChange={setShowValidationAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Mark as Complete</AlertDialogTitle>
            <AlertDialogDescription>
              This transaction is missing required information. Please update the following fields before marking as complete:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              {validationErrors.map((error, index) => (
                <li key={error} className="text-destructive font-medium">{error}</li>
              ))}
            </ul>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowValidationAlert(false)}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => {
                setShowValidationAlert(false);
                setEditDialogOpen(true);
              }}
            >
              Edit Transaction
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {transaction && onEdit && (
        <EditTransactionDialog
          transaction={transaction}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={onEdit}
          onDelete={onDelete}
        />
      )}
    </>
  );
};
