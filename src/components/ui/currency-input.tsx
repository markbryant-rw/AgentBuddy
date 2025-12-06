import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | undefined | null;
  onChange: (value: number | undefined) => void;
  currency?: string;
  locale?: string;
}

const formatCurrencyDisplay = (value: number | undefined | null, locale: string = 'en-NZ', currency: string = 'NZD'): string => {
  if (value === undefined || value === null || isNaN(value)) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const parseCurrencyInput = (input: string): number | undefined => {
  // Remove all non-numeric characters except decimal point
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return undefined;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : Math.round(parsed);
};

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, currency = 'NZD', locale = 'en-NZ', placeholder = '$0', ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>('');
    const [isFocused, setIsFocused] = React.useState(false);

    // Sync display value when external value changes (and not focused)
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatCurrencyDisplay(value, locale, currency));
      }
    }, [value, isFocused, locale, currency]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      setDisplayValue(rawInput);
      
      const numericValue = parseCurrencyInput(rawInput);
      onChange(numericValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Show raw number when focused for easier editing
      if (value !== undefined && value !== null) {
        setDisplayValue(value.toString());
      }
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Format on blur
      setDisplayValue(formatCurrencyDisplay(value, locale, currency));
      props.onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };