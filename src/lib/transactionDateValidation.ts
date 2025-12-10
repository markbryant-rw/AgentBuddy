import { startOfDay, isAfter, isBefore, parseISO } from 'date-fns';

// Define the chronological order of transaction stage dates
export const DATE_FIELD_ORDER = [
  'listing_signed_date',
  'photoshoot_date',
  'building_report_date',
  'live_date',
  'auction_deadline_date',
  'listing_expires_date',
  'contract_date',
  'conditional_date',
  'unconditional_date',
  'pre_settlement_inspection_date',
  'settlement_date',
] as const;

export type DateFieldName = typeof DATE_FIELD_ORDER[number];

// Date field labels for error messages
export const DATE_FIELD_LABELS: Record<DateFieldName, string> = {
  listing_signed_date: 'Listing Signed',
  photoshoot_date: 'Photoshoot',
  building_report_date: 'Building Report',
  live_date: 'Live Date',
  auction_deadline_date: 'Auction/Deadline',
  listing_expires_date: 'Listing Expires',
  contract_date: 'Contract Date',
  conditional_date: 'Conditions Due',
  unconditional_date: 'Unconditional',
  pre_settlement_inspection_date: 'Pre-Settlement Inspection',
  settlement_date: 'Settlement',
};

// Fields that can be in the future (expiry/deadline dates)
export const FUTURE_ALLOWED_FIELDS: DateFieldName[] = [
  'photoshoot_date',
  'building_report_date',
  'live_date',
  'auction_deadline_date',
  'listing_expires_date',
  'conditional_date',
  'pre_settlement_inspection_date',
  'settlement_date',
];

export interface DateValidationError {
  field: string;
  message: string;
}

/**
 * Validates that a date is not in the future (for dates that shouldn't be future)
 */
export const validateNotFuture = (
  field: DateFieldName,
  value: string | Date | null | undefined
): DateValidationError | null => {
  if (!value) return null;
  
  // Skip validation for fields that can be in the future
  if (FUTURE_ALLOWED_FIELDS.includes(field)) {
    return null;
  }
  
  const date = typeof value === 'string' ? parseISO(value) : value;
  const today = startOfDay(new Date());
  
  if (isAfter(startOfDay(date), today)) {
    return {
      field,
      message: `${DATE_FIELD_LABELS[field]} cannot be in the future`,
    };
  }
  
  return null;
};

/**
 * Validates chronological order between two dates
 */
export const validateChronologicalOrder = (
  earlierField: DateFieldName,
  laterField: DateFieldName,
  earlierValue: string | Date | null | undefined,
  laterValue: string | Date | null | undefined
): DateValidationError | null => {
  // Skip if either date is missing
  if (!earlierValue || !laterValue) return null;
  
  const earlierDate = typeof earlierValue === 'string' ? parseISO(earlierValue) : earlierValue;
  const laterDate = typeof laterValue === 'string' ? parseISO(laterValue) : laterValue;
  
  // The later date should not be before the earlier date
  if (isBefore(startOfDay(laterDate), startOfDay(earlierDate))) {
    return {
      field: laterField,
      message: `${DATE_FIELD_LABELS[laterField]} cannot be before ${DATE_FIELD_LABELS[earlierField]}`,
    };
  }
  
  return null;
};

/**
 * Validates all transaction dates for a given data object
 * Returns array of validation errors
 */
export const validateTransactionDates = (
  data: Record<string, any>
): DateValidationError[] => {
  const errors: DateValidationError[] = [];
  
  // Get all date fields that have values
  const dateFields = DATE_FIELD_ORDER.filter(field => data[field]);
  
  // Validate each date is not in the future (for applicable fields)
  dateFields.forEach(field => {
    const error = validateNotFuture(field, data[field]);
    if (error) {
      errors.push(error);
    }
  });
  
  // Validate chronological order between all pairs
  for (let i = 0; i < dateFields.length; i++) {
    for (let j = i + 1; j < dateFields.length; j++) {
      const earlierField = dateFields[i];
      const laterField = dateFields[j];
      
      // Only compare if the earlier field should come before the later field in the order
      const earlierIndex = DATE_FIELD_ORDER.indexOf(earlierField);
      const laterIndex = DATE_FIELD_ORDER.indexOf(laterField);
      
      if (earlierIndex < laterIndex) {
        const error = validateChronologicalOrder(
          earlierField,
          laterField,
          data[earlierField],
          data[laterField]
        );
        if (error) {
          errors.push(error);
        }
      }
    }
  }
  
  return errors;
};

/**
 * Gets a user-friendly validation message for a specific field
 */
export const getFieldValidationMessage = (
  field: DateFieldName,
  data: Record<string, any>
): string | null => {
  const errors = validateTransactionDates(data);
  const fieldError = errors.find(e => e.field === field);
  return fieldError?.message || null;
};
