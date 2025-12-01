// Proper type definitions for transaction data
// Issue #19: Replace 'any' types with proper interfaces

export interface Assignees {
  lead_salesperson?: string;
  secondary_salesperson?: string | null;
  admin?: string;
  support?: string | null;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface VendorName {
  first_name: string;
  last_name: string;
  full_name?: string;
}

export interface BuyerName {
  first_name: string;
  last_name: string;
  full_name?: string;
}
