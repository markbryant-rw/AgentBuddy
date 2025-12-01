import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface KPIInputCardProps {
  type: string;
  label: string;
  icon: LucideIcon;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const KPIInputCard = ({ 
  type, 
  label, 
  icon: Icon, 
  value, 
  onChange, 
  disabled = false 
}: KPIInputCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      <Card className={`p-4 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:border-primary/50 cursor-pointer'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <Label htmlFor={type} className="font-semibold text-base cursor-pointer">
            {label}
          </Label>
        </div>
        <Input 
          id={type}
          type="number"
          min="0"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="text-3xl font-bold text-center h-16 border-2 focus:border-primary"
          placeholder="0"
          disabled={disabled}
        />
      </Card>
    </motion.div>
  );
};
