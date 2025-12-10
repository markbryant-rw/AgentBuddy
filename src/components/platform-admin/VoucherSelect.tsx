import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Crown, FlaskConical, CreditCard } from 'lucide-react';

interface VoucherSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export function VoucherSelect({ value, onValueChange, label = "License", disabled }: VoucherSelectProps) {
  const { data: vouchers = [] } = useQuery({
    queryKey: ['active-vouchers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_voucher_codes')
        .select('code, name, license_type, description, license_duration_days')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const getVoucherIcon = (code: string) => {
    if (code.includes('FOUNDER')) return <Crown className="h-4 w-4 text-amber-500" />;
    if (code.includes('TESTER')) return <FlaskConical className="h-4 w-4 text-purple-500" />;
    return null;
  };

  const getVoucherDescription = (voucher: typeof vouchers[0]) => {
    if (voucher.license_duration_days) {
      return `${voucher.license_duration_days} days`;
    }
    if (voucher.license_type === 'admin_unlimited') {
      return 'Permanent';
    }
    return '';
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select license type..." />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={5}>
          <SelectItem value="standard">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>Standard Billing</span>
              <span className="text-xs text-muted-foreground ml-1">(Stripe)</span>
            </div>
          </SelectItem>
          {vouchers.map((voucher) => (
            <SelectItem key={voucher.code} value={voucher.code}>
              <div className="flex items-center gap-2">
                {getVoucherIcon(voucher.code)}
                <span>{voucher.name}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({getVoucherDescription(voucher)})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
