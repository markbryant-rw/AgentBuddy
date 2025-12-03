import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportRow {
  [key: string]: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: any;
}

interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  warnings: number;
}

export const usePastSalesImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const normalizeColumnName = (name: string): string => {
    return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  };

  const findColumn = (row: ImportRow, possibleNames: string[]): string | null => {
    const normalizedRow = Object.keys(row).reduce((acc, key) => {
      acc[normalizeColumnName(key)] = row[key];
      return acc;
    }, {} as Record<string, string>);

    for (const name of possibleNames) {
      const normalized = normalizeColumnName(name);
      if (normalizedRow[normalized]) {
        return normalizedRow[normalized];
      }
    }
    return null;
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Try various date formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          return dateStr; // Already in correct format
        } else {
          // Convert to YYYY-MM-DD
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
      }
    }

    // Try native Date parsing as fallback
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return null;
  };

  const parseNumber = (numStr: string): number | null => {
    if (!numStr) return null;
    const cleaned = numStr.replace(/[$,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const splitList = (str: string): string[] => {
    if (!str) return [];
    return str.split(',').map(item => item.trim()).filter(Boolean);
  };

  const splitName = (fullName: string): { first_name: string; last_name: string } => {
    if (!fullName) return { first_name: '', last_name: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0], last_name: '' };
    }
    return {
      first_name: parts[0],
      last_name: parts.slice(1).join(' ')
    };
  };

  const toTitleCase = (str: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const extractSuburb = (address: string): string => {
    if (!address) return '';
    // Split by comma and take the second-to-last segment
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      // Return the second part (typically suburb)
      return parts[1];
    }
    return '';
  };

  const calculateDaysBetween = (startDate: string | null, endDate: string | null): number | null => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const mapRowToPastSale = (row: ImportRow): any => {
    const rawAddress = findColumn(row, ['listing_address', 'address', 'property_address', 'street_address']);
    let rawSuburb = findColumn(row, ['suburb', 'city']);
    const region = findColumn(row, ['region', 'area', 'district']);
    
    // Extract suburb from address if not provided
    if (!rawSuburb && rawAddress) {
      rawSuburb = extractSuburb(rawAddress);
    }
    
    // Apply title case to address and suburb
    const address = toTitleCase(rawAddress || '');
    const suburb = toTitleCase(rawSuburb || '');
    
    const settlementDate = parseDate(findColumn(row, ['settlement_date', 'settlement', 'settled_date']) || '');
    const listingDate = parseDate(findColumn(row, ['listing_signed_date', 'listing_date', 'listing_signed', 'contract_signed_date']) || '');
    const listingLiveDate = parseDate(findColumn(row, ['listing_live_date', 'listing_live', 'went_live_date', 'live_date']) || '');
    const unconditionalDate = parseDate(findColumn(row, ['unconditional_date', 'listing_unconditional', 'unconditional', 'gone_unconditional_date']) || '');
    const appraisalDate = parseDate(findColumn(row, ['appraisal_date']) || '');
    const firstContactDate = parseDate(findColumn(row, ['first_contact_date', 'first_contact', 'lead_date']) || '');
    const lostDate = parseDate(findColumn(row, ['lost_date']) || '');

    const appraisalLow = parseNumber(findColumn(row, ['appraisal_value_low', 'appraisal_low', 'appraisal_min', 'low_appraisal']) || '');
    const appraisalHigh = parseNumber(findColumn(row, ['appraisal_value_high', 'appraisal_high', 'appraisal_max', 'high_appraisal']) || '');
    const salePrice = parseNumber(findColumn(row, ['sale_value', 'sale_price', 'sold_price', 'final_price']) || '');
    const listingPrice = parseNumber(findColumn(row, ['listing_price', 'asking_price']) || '');
    const commissionRate = parseNumber(findColumn(row, ['commission_rate', 'commission_%']) || '');
    const commissionAmount = parseNumber(findColumn(row, ['commission_amount', 'commission', 'commission_$']) || '');

    // Map status - accept sold, withdrawn, or lost
    let status = 'won_and_sold';
    const statusRaw = findColumn(row, ['status']);
    const lostReason = findColumn(row, ['lost_reason', 'reason_lost', 'withdraw_reason']);
    if (statusRaw) {
      const normalized = statusRaw.toLowerCase().trim();
      if (normalized === 'withdrawn' || normalized === 'withdraw' || normalized === 'lost' || normalized === 'lost_listing') {
        status = 'withdrawn';
      } else if (normalized === 'sold' || normalized === 'won_and_sold' || normalized === 'won and sold' || normalized === 'won') {
        status = 'won_and_sold';
      }
    }
    
    const leadSource = findColumn(row, ['lead_source']);
    const referralPartner = findColumn(row, ['referral_partner', 'referral', 'referred_by']);
    const cabinetNumber = findColumn(row, ['cabinet_number', 'cabinet', 'file_number']);
    
    // Referral partner flags
    const vendorIsReferral = findColumn(row, ['vendor_referral_partner', 'vendor_referral']);
    const buyerIsReferral = findColumn(row, ['buyer_referral_partner', 'buyer_referral']);
    
    // Auto-calculate DOM from dates if not provided
    let daysOnMarket = parseNumber(findColumn(row, ['dom', 'days_on_market']) || '');
    if (!daysOnMarket && listingLiveDate && unconditionalDate) {
      daysOnMarket = calculateDaysBetween(listingLiveDate, unconditionalDate);
    }

    // Auto-calculate lead-to-listing timeline
    let daysToConvert = null;
    if (firstContactDate && listingDate) {
      daysToConvert = calculateDaysBetween(firstContactDate, listingDate);
    }

    // Vendor details - handle both split and single name formats
    let vendorFirstName = findColumn(row, ['vendor_first_name']);
    let vendorLastName = findColumn(row, ['vendor_last_name', 'vendor_surname']);
    const vendorFullName = findColumn(row, ['vendor_name', 'vendor']);
    
    // If single name field provided, split it
    if (!vendorFirstName && !vendorLastName && vendorFullName) {
      const split = splitName(vendorFullName);
      vendorFirstName = split.first_name;
      vendorLastName = split.last_name;
    }

    const vendorEmail = findColumn(row, ['vendor_email', 'vendor_details']);
    const vendorPhone = findColumn(row, ['vendor_phone', 'vendor_mobile', 'vendor_contact']);
    const vendorChildren = splitList(findColumn(row, ['vendor_children', 'kids']) || '');
    const vendorPets = splitList(findColumn(row, ['vendor_pets', 'pets']) || '');
    const movedTo = findColumn(row, ['where_did_they_go', 'moved_to', 'new_address', 'vendor_moved_to']);
    const movedDate = parseDate(findColumn(row, ['moved_date']) || '');

    // Calculate referral value based on appraisal if vendor is referral partner
    const vendorReferralValue = (vendorIsReferral && (vendorIsReferral.toLowerCase() === 'yes' || vendorIsReferral.toLowerCase() === 'true')) && (appraisalHigh || appraisalLow)
      ? ((appraisalHigh || appraisalLow || 0) * 0.015) // 1.5% of appraisal value
      : undefined;

    const vendorDetails = (vendorFirstName || vendorLastName || vendorEmail || vendorPhone) ? {
      primary: {
        first_name: vendorFirstName || '',
        last_name: vendorLastName || '',
        email: vendorEmail || '',
        phone: vendorPhone || '',
        children: vendorChildren,
        pets: vendorPets,
        moved_to: movedTo || '',
        moved_date: movedDate || '',
        relationship_notes: '',
        is_referral_partner: vendorIsReferral ? (vendorIsReferral.toLowerCase() === 'yes' || vendorIsReferral.toLowerCase() === 'true') : false,
        referral_value: vendorReferralValue,
        referral_notes: ''
      }
    } : null;

    // Buyer details - handle both split and single name formats
    let buyerFirstName = findColumn(row, ['buyer_first_name']);
    let buyerLastName = findColumn(row, ['buyer_last_name', 'buyer_surname']);
    const buyerFullName = findColumn(row, ['buyer_name', 'buyer']);
    
    // If single name field provided, split it
    if (!buyerFirstName && !buyerLastName && buyerFullName) {
      const split = splitName(buyerFullName);
      buyerFirstName = split.first_name;
      buyerLastName = split.last_name;
    }

    const buyerEmail = findColumn(row, ['buyer_email', 'buyer_details']);
    const buyerPhone = findColumn(row, ['buyer_phone', 'buyer_mobile', 'buyer_contact']);

    // Calculate referral value based on appraisal if buyer is referral partner
    const buyerReferralValue = (buyerIsReferral && (buyerIsReferral.toLowerCase() === 'yes' || buyerIsReferral.toLowerCase() === 'true')) && (appraisalHigh || appraisalLow)
      ? ((appraisalHigh || appraisalLow || 0) * 0.015) // 1.5% of appraisal value
      : undefined;

    const buyerDetails = (buyerFirstName || buyerLastName || buyerEmail || buyerPhone) ? {
      first_name: buyerFirstName || '',
      last_name: buyerLastName || '',
      email: buyerEmail || '',
      phone: buyerPhone || '',
      children: [],
      pets: [],
      moving_from: '',
      relationship_notes: '',
      is_referral_partner: buyerIsReferral ? (buyerIsReferral.toLowerCase() === 'yes' || buyerIsReferral.toLowerCase() === 'true') : false,
      referral_value: buyerReferralValue,
      referral_notes: ''
    } : null;

    return {
      address,
      suburb,
      region,
      settlement_date: settlementDate,
      listing_signed_date: listingDate,
      listing_live_date: listingLiveDate,
      unconditional_date: unconditionalDate,
      appraisal_date: appraisalDate,
      first_contact_date: firstContactDate,
      lost_date: lostDate,
      appraisal_low: appraisalLow,
      appraisal_high: appraisalHigh,
      sale_price: salePrice,
      listing_price: listingPrice,
      commission_rate: commissionRate,
      commission: commissionAmount,
      status,
      lead_source: leadSource,
      lead_source_detail: referralPartner || '',
      lost_reason: lostReason || '',
      days_on_market: daysOnMarket,
      vendor_details: vendorDetails,
      buyer_details: buyerDetails
    };
  };

  const validateRow = (data: any, index: number): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const isLostOrWithdrawn = data.status === 'withdrawn' || data.status === 'lost' || data.status === 'lost_listing';

    // Required fields for ALL records
    if (!data.address) {
      errors.push(`Row ${index + 1}: Address is required`);
    }

    // Check if address has comma (suburb extraction validation)
    if (data.address && !data.address.includes(',')) {
      warnings.push(`Row ${index + 1}: Address should include suburb after comma (e.g., "123 Smith St, Glen Eden")`);
    }

    // Status-aware validation: WON/SOLD properties need more fields
    if (!isLostOrWithdrawn) {
      // For WON/SOLD: require key dates and sale price
      if (!data.sale_price) {
        errors.push(`Row ${index + 1}: Sale price is required for sold properties`);
      }
      if (!data.listing_live_date) {
        warnings.push(`Row ${index + 1}: Missing listing live date (needed for Days on Market calculation)`);
      }
      if (!data.unconditional_date) {
        warnings.push(`Row ${index + 1}: Missing unconditional date (needed for Days on Market calculation)`);
      }
      if (!data.settlement_date) {
        warnings.push(`Row ${index + 1}: Missing settlement date (needed for follow-up scheduling)`);
      }
    } else {
      // For LOST/WITHDRAWN: only address is required, rest is optional
      if (!data.lost_date && !data.listing_live_date) {
        warnings.push(`Row ${index + 1}: Consider adding lost date or listing live date for timeline tracking`);
      }
    }

    // Warnings for all records
    if (!data.suburb) {
      warnings.push(`Row ${index + 1}: Missing suburb (may affect geocoding)`);
    }

    // Date sequence validation (only if dates are provided)
    if (data.first_contact_date && data.listing_signed_date) {
      if (new Date(data.first_contact_date) > new Date(data.listing_signed_date)) {
        warnings.push(`Row ${index + 1}: First contact date is after listing signed date`);
      }
    }

    if (data.listing_live_date && data.unconditional_date) {
      if (new Date(data.listing_live_date) > new Date(data.unconditional_date)) {
        warnings.push(`Row ${index + 1}: Listing live date is after unconditional date`);
      }
    }

    if (data.unconditional_date && data.settlement_date) {
      if (new Date(data.unconditional_date) > new Date(data.settlement_date)) {
        warnings.push(`Row ${index + 1}: Unconditional date is after settlement date`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data
    };
  };

  const parseCSV = (file: File): Promise<ValidationResult[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const validatedRows = results.data.map((row: any, index: number) => {
            const mappedData = mapRowToPastSale(row);
            return validateRow(mappedData, index);
          });
          resolve(validatedRows);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  const importPastSales = async (
    validatedRows: ValidationResult[],
    teamId: string
  ): Promise<ImportSummary> => {
    setIsImporting(true);
    setProgress(0);

    // Check user authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setIsImporting(false);
      toast.error('You must be logged in to import records');
      throw new Error('User not authenticated');
    }

    const summary: ImportSummary = {
      total: validatedRows.length,
      successful: 0,
      failed: 0,
      warnings: 0
    };

    // Filter valid rows
    const validRows = validatedRows.filter(r => r.valid);
    const chunkSize = 50;

    try {
      for (let i = 0; i < validRows.length; i += chunkSize) {
        const chunk = validRows.slice(i, i + chunkSize);
        const records = chunk.map(r => ({
          ...r.data,
          team_id: teamId,
          created_by: user.id
        }));

        const { data, error } = await supabase
          .from('past_sales')
          .insert(records)
          .select();

        if (error) {
          console.error('Import error:', error);
          summary.failed += chunk.length;
          
          // Show detailed error message
          const errorMsg = error.message.includes('row-level security')
            ? 'Permission denied: Cannot insert records'
            : `Failed to import: ${error.message}`;
          toast.error(errorMsg);
        } else {
          summary.successful += data?.length || 0;
          
          // Trigger geocoding for imported records
          if (data) {
            for (const record of data) {
              try {
                await supabase.functions.invoke('geocode-past-sale', {
                  body: { pastSaleId: record.id }
                });
              } catch (geocodeError) {
                console.error('Geocoding error:', geocodeError);
              }
            }
          }
        }

        setProgress(Math.round(((i + chunk.length) / validRows.length) * 100));
      }

      summary.warnings = validatedRows.filter(r => r.warnings.length > 0).length;
      summary.failed = validatedRows.filter(r => !r.valid).length;

      if (summary.successful > 0) {
        toast.success(`Successfully imported ${summary.successful} records`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import records');
    } finally {
      setIsImporting(false);
      setProgress(0);
    }

    return summary;
  };

  /**
   * Parse Google Sheets data (already fetched as JSON array)
   * Uses the same mapping and validation as CSV
   */
  const parseGoogleSheetData = (data: Record<string, string>[]): ValidationResult[] => {
    return data.map((row, index) => {
      const mappedData = mapRowToPastSale(row);
      return validateRow(mappedData, index);
    });
  };

  return {
    parseCSV,
    parseGoogleSheetData,
    importPastSales,
    isImporting,
    progress
  };
};
