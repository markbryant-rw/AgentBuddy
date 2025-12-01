import { TransactionStage } from '@/hooks/useTransactions';
import { addDays, differenceInDays } from 'date-fns';

export interface StageTransitionConfig {
  title: string;
  requiredFields: string[];
  optionalFields?: string[];
  celebrate?: boolean;
  confetti?: boolean;
  message?: string;
  prominentField?: string;
  autoCalculations?: (data: any) => Partial<any>;
}

export interface DealCollapseReason {
  value: string;
  label: string;
}

export const COLLAPSE_REASONS: DealCollapseReason[] = [
  { value: 'finance_fell_through', label: 'Finance fell through' },
  { value: 'inspection_issues', label: 'Inspection issues' },
  { value: 'buyer_pulled_out', label: 'Buyer pulled out' },
  { value: 'conditions_not_met', label: 'Conditions not met' },
  { value: 'price_negotiation_failed', label: 'Price negotiation failed' },
  { value: 'vendor_changed_mind', label: 'Vendor changed mind' },
  { value: 'other', label: 'Other' },
];

// Forward stage transitions configuration
export const FORWARD_TRANSITIONS: Record<string, StageTransitionConfig> = {
  'signed->live': {
    title: '🎯 List Property Live',
    requiredFields: ['live_date', 'auction_deadline_date'],
    celebrate: true,
    message: 'Property is now live on the market! 🎉',
    autoCalculations: (data) => {
      const calculations: any = {};
      // Days on market will be calculated in real-time
      return calculations;
    },
  },
  'live->contract': {
    title: '🤝 Property Under Contract',
    requiredFields: ['contract_date', 'conditional_date'],
    optionalFields: ['buyer_names'],
    celebrate: true,
    message: 'Under contract! Great work! 🎊',
    autoCalculations: (data) => {
      return {};
    },
  },
  'contract->unconditional': {
    title: '🎉 Congratulations! Property is Unconditional',
    requiredFields: ['sale_price', 'unconditional_date', 'settlement_date'],
    celebrate: true,
    confetti: true,
    message: 'Unconditional! Fantastic work! 🎊',
    prominentField: 'sale_price',
    autoCalculations: (data) => {
      return {};
    },
  },
  'unconditional->settled': {
    title: '💰 Property Settled',
    requiredFields: ['settlement_date'],
    optionalFields: ['sale_price'],
    celebrate: true,
    confetti: true,
    message: 'Settlement complete! Added to Past Sales History! 💰',
    autoCalculations: (data) => {
      return {};
    },
  },
};

// Initial listing creation (not a stage change, but uses same system)
export const LISTING_CREATION_CONFIG: StageTransitionConfig = {
  title: '📝 New Listing Agreement',
  requiredFields: ['listing_signed_date'],
  message: 'New listing created successfully!',
  autoCalculations: (data) => {
    if (data.listing_signed_date) {
      return {
        listing_expires_date: addDays(new Date(data.listing_signed_date), 90)
          .toISOString()
          .split('T')[0],
      };
    }
    return {};
  },
};

// Helper to get transition key
export const getTransitionKey = (
  fromStage: TransactionStage,
  toStage: TransactionStage
): string => {
  return `${fromStage}->${toStage}`;
};

// Helper to check if it's a forward transition
export const isForwardTransition = (
  fromStage: TransactionStage,
  toStage: TransactionStage
): boolean => {
  const stages: TransactionStage[] = ['signed', 'live', 'contract', 'unconditional', 'settled'];
  const fromIndex = stages.indexOf(fromStage);
  const toIndex = stages.indexOf(toStage);
  return toIndex > fromIndex;
};

// Helper to check if it's a backward transition
export const isBackwardTransition = (
  fromStage: TransactionStage,
  toStage: TransactionStage
): boolean => {
  const stages: TransactionStage[] = ['signed', 'live', 'contract', 'unconditional', 'settled'];
  const fromIndex = stages.indexOf(fromStage);
  const toIndex = stages.indexOf(toStage);
  return toIndex < fromIndex;
};

// Get configuration for a transition
export const getTransitionConfig = (
  fromStage: TransactionStage,
  toStage: TransactionStage
): StageTransitionConfig | null => {
  const key = getTransitionKey(fromStage, toStage);
  return FORWARD_TRANSITIONS[key] || null;
};

// Validation helper
export const validateTransitionData = (
  config: StageTransitionConfig,
  data: any
): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  config.requiredFields.forEach((field) => {
    if (!data[field] || data[field] === '') {
      missingFields.push(field);
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

// Field labels for display
export const FIELD_LABELS: Record<string, string> = {
  listing_signed_date: 'Agreement Signed Date',
  live_date: 'Live Date',
  auction_deadline_date: 'Auction/Deadline Date',
  contract_date: 'Contract Date',
  conditional_date: 'Conditions Due Date',
  sale_price: 'Sale Price',
  unconditional_date: 'Unconditional Date',
  settlement_date: 'Settlement Date',
  buyer_names: 'Buyer Names',
};
