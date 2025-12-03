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

export const useAppraisalsImport = () => {
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
    
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          return dateStr;
        } else {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
      }
    }

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
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      return parts[1];
    }
    return '';
  };

  const mapRowToAppraisal = (row: ImportRow): any => {
    const rawAddress = findColumn(row, ['address', 'property_address', 'street_address', 'listing_address']);
    let rawSuburb = findColumn(row, ['suburb', 'city', 'location']);
    
    if (!rawSuburb && rawAddress) {
      rawSuburb = extractSuburb(rawAddress);
    }
    
    const address = toTitleCase(rawAddress || '');
    const suburb = toTitleCase(rawSuburb || '');
    
    const appraisalDate = parseDate(findColumn(row, ['appraisal_date', 'date', 'appraisal']) || '');
    const nextFollowUp = parseDate(findColumn(row, ['next_follow_up', 'follow_up', 'next_contact', 'followup_date']) || '');
    const lastContact = parseDate(findColumn(row, ['last_contact', 'last_contact_date', 'contacted']) || '');
    
    const appraisalLow = parseNumber(findColumn(row, ['appraisal_low', 'appraisal_range_low', 'low_value', 'min_value', 'appraisal_value_low']) || '');
    const appraisalHigh = parseNumber(findColumn(row, ['appraisal_high', 'appraisal_range_high', 'high_value', 'max_value', 'appraisal_value_high']) || '');
    const estimatedValue = parseNumber(findColumn(row, ['estimated_value', 'value', 'estimate', 'appraisal_value']) || '');
    
    const vendorName = findColumn(row, ['vendor_name', 'vendor', 'owner', 'client', 'name']);
    const intent = findColumn(row, ['intent', 'selling_intent', 'motivation']);
    const status = findColumn(row, ['status']) || 'pending';
    const stage = findColumn(row, ['stage']) || 'prospecting';
    const leadSource = findColumn(row, ['lead_source', 'source', 'lead']);
    const appraisalMethod = findColumn(row, ['appraisal_method', 'method', 'type']);
    const notes = findColumn(row, ['notes', 'comments', 'description']);

    return {
      address,
      suburb,
      appraisal_date: appraisalDate,
      next_follow_up: nextFollowUp,
      last_contact: lastContact,
      appraisal_range_low: appraisalLow,
      appraisal_range_high: appraisalHigh,
      estimated_value: estimatedValue,
      vendor_name: vendorName,
      intent,
      status,
      stage,
      lead_source: leadSource,
      appraisal_method: appraisalMethod,
      notes
    };
  };

  const validateRow = (data: any, index: number): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.address) {
      errors.push(`Row ${index + 1}: Address is required`);
    }

    if (!data.appraisal_date) {
      errors.push(`Row ${index + 1}: Appraisal date is required`);
    }

    // Address format check
    if (data.address && !data.address.includes(',')) {
      warnings.push(`Row ${index + 1}: Address should include suburb after comma (e.g., "123 Smith St, Glen Eden")`);
    }

    // Warnings for helpful but optional fields
    if (!data.suburb) {
      warnings.push(`Row ${index + 1}: Missing suburb (may affect geocoding)`);
    }

    if (!data.vendor_name) {
      warnings.push(`Row ${index + 1}: Missing vendor name`);
    }

    if (!data.appraisal_range_low && !data.appraisal_range_high && !data.estimated_value) {
      warnings.push(`Row ${index + 1}: Missing appraisal value (low/high range or estimated)`);
    }

    // Date sequence validation
    if (data.appraisal_date && data.next_follow_up) {
      if (new Date(data.appraisal_date) > new Date(data.next_follow_up)) {
        warnings.push(`Row ${index + 1}: Appraisal date is after next follow-up date`);
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
            const mappedData = mapRowToAppraisal(row);
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

  const parseGoogleSheetData = (data: any[]): ValidationResult[] => {
    return data.map((row, index) => {
      const mappedData = mapRowToAppraisal(row);
      return validateRow(mappedData, index);
    });
  };

  const importAppraisals = async (
    validatedRows: ValidationResult[],
    teamId: string
  ): Promise<ImportSummary> => {
    setIsImporting(true);
    setProgress(0);

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

    const validRows = validatedRows.filter(r => r.valid);
    const chunkSize = 50;

    try {
      // Fetch existing records to detect duplicates
      const { data: existingRecords } = await supabase
        .from('logged_appraisals')
        .select('address, appraisal_date')
        .eq('team_id', teamId);

      const existingSet = new Set(
        (existingRecords || []).map(r => 
          `${(r.address || '').toLowerCase().trim()}|${r.appraisal_date || ''}`
        )
      );

      // Filter out duplicates
      const uniqueRows = validRows.filter(r => {
        const key = `${(r.data.address || '').toLowerCase().trim()}|${r.data.appraisal_date || ''}`;
        if (existingSet.has(key)) {
          return false;
        }
        existingSet.add(key);
        return true;
      });

      const skippedDuplicates = validRows.length - uniqueRows.length;
      if (skippedDuplicates > 0) {
        toast.info(`Skipped ${skippedDuplicates} duplicate records`);
      }

      for (let i = 0; i < uniqueRows.length; i += chunkSize) {
        const chunk = uniqueRows.slice(i, i + chunkSize);
        const records = chunk.map(r => ({
          ...r.data,
          team_id: teamId,
          user_id: user.id,
          created_by: user.id
        }));

        const { data, error } = await supabase
          .from('logged_appraisals')
          .insert(records)
          .select();

        if (error) {
          console.error('Import error:', error);
          summary.failed += chunk.length;
          
          const errorMsg = error.message.includes('row-level security')
            ? 'Permission denied: Cannot insert records'
            : `Failed to import: ${error.message}`;
          toast.error(errorMsg);
        } else {
          summary.successful += data?.length || 0;
          
          // Fire-and-forget geocoding for imported records
          if (data && data.length > 0) {
            data.forEach(record => {
              supabase.functions.invoke('geocode-appraisal', {
                body: { appraisalId: record.id }
              }).catch(err => console.log('Geocoding queued:', err));
            });
          }
        }

        setProgress(Math.round(((i + chunk.length) / uniqueRows.length) * 100));
      }

      // Count warnings
      summary.warnings = validRows.filter(r => r.warnings.length > 0).length;

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    setIsImporting(false);
    return summary;
  };

  return {
    parseCSV,
    parseGoogleSheetData,
    importAppraisals,
    isImporting,
    progress
  };
};
