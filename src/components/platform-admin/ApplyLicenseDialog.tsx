import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Crown, FlaskConical, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApplyLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onComplete?: () => void;
}

interface VoucherCode {
  id: string;
  code: string;
  name: string;
  license_type: string;
  license_duration_days: number | null;
  description: string | null;
}

export const ApplyLicenseDialog = ({ 
  open, 
  onOpenChange, 
  teamId, 
  teamName,
  onComplete 
}: ApplyLicenseDialogProps) => {
  const [selectedVoucher, setSelectedVoucher] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch available voucher codes
  const { data: vouchers = [], isLoading: loadingVouchers } = useQuery({
    queryKey: ['admin-voucher-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_voucher_codes')
        .select('id, code, name, license_type, license_duration_days, description')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()');
      
      if (error) throw error;
      return data as VoucherCode[];
    },
    enabled: open,
  });

  // Apply voucher mutation
  const applyVoucher = useMutation({
    mutationFn: async (voucherCode: string) => {
      // Find the voucher
      const voucher = vouchers.find(v => v.code === voucherCode);
      if (!voucher) throw new Error('Voucher not found');

      // Create redemption record
      const { error: redemptionError } = await supabase
        .from('voucher_redemptions')
        .insert({
          voucher_id: voucher.id,
          team_id: teamId,
          redeemed_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (redemptionError) throw redemptionError;

      // Update team license type
      const { error: teamError } = await supabase
        .from('teams')
        .update({ license_type: voucher.license_type })
        .eq('id', teamId);

      if (teamError) throw teamError;

      // Increment redemption count
      await supabase
        .from('admin_voucher_codes')
        .update({ current_redemptions: (voucher as any).current_redemptions + 1 })
        .eq('id', voucher.id);

      return voucher;
    },
    onSuccess: (voucher) => {
      toast.success(`Applied ${voucher.name} license to ${teamName}`);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      onOpenChange(false);
      onComplete?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to apply license');
    },
  });

  const handleSkip = () => {
    toast.info(`${teamName} will use standard billing`);
    onOpenChange(false);
    onComplete?.();
  };

  const handleApply = () => {
    if (selectedVoucher) {
      applyVoucher.mutate(selectedVoucher);
    }
  };

  const getVoucherIcon = (code: string) => {
    if (code.includes('FOUNDER')) return Crown;
    if (code.includes('TESTER')) return FlaskConical;
    return CreditCard;
  };

  const getVoucherColor = (code: string) => {
    if (code.includes('FOUNDER')) return 'from-amber-500 to-yellow-500';
    if (code.includes('TESTER')) return 'from-purple-500 to-violet-500';
    return 'from-blue-500 to-cyan-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply License to {teamName}</DialogTitle>
          <DialogDescription>
            Select a license type for this team, or skip to use standard billing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {loadingVouchers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {vouchers.map((voucher) => {
                const Icon = getVoucherIcon(voucher.code);
                const gradientColor = getVoucherColor(voucher.code);
                const isSelected = selectedVoucher === voucher.code;

                return (
                  <button
                    key={voucher.id}
                    type="button"
                    onClick={() => setSelectedVoucher(voucher.code)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 transition-all text-left",
                      "hover:shadow-md",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg bg-gradient-to-br text-white",
                        gradientColor
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{voucher.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {voucher.license_duration_days 
                            ? `${voucher.license_duration_days} days access`
                            : 'Permanent access'}
                        </div>
                        {voucher.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {voucher.description}
                          </div>
                        )}
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      )}>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Skip option */}
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 transition-all text-left",
                  "hover:shadow-md",
                  selectedVoucher === null 
                    ? "border-muted-foreground bg-muted/50" 
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Standard Billing</div>
                    <div className="text-sm text-muted-foreground">
                      Team will manage their own subscription via Stripe
                    </div>
                  </div>
                </div>
              </button>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={applyVoucher.isPending}
          >
            Skip
          </Button>
          <Button
            onClick={handleApply}
            disabled={applyVoucher.isPending || selectedVoucher === null}
          >
            {applyVoucher.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : selectedVoucher ? (
              'Apply License'
            ) : (
              'Use Standard Billing'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};