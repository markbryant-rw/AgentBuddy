import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { normalizeNZMobile } from '@/lib/phoneUtils';
import { validateEmail } from '@/lib/validation';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface CSVRow {
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string;
  office_name: string;
  team_name?: string;
  role: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface ParsedUser extends CSVRow {
  id: string; // Temporary ID for UI management
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  normalizedMobile?: string;
  officeId?: string;
  teamId?: string;
  validatedRole?: AppRole;
  isSelected: boolean;
}

const ALLOWED_ROLES: AppRole[] = ['team_leader', 'salesperson', 'assistant'];

export const useUserImport = () => {
  const [isParsing, setIsParsing] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);

  const validateRole = (role: string): AppRole | null => {
    const normalized = role.toLowerCase().trim().replace(/\s+/g, '_');
    if (ALLOWED_ROLES.includes(normalized as AppRole)) {
      return normalized as AppRole;
    }
    return null;
  };

  const validateUser = async (
    row: CSVRow,
    index: number,
    managerOfficeId: string
  ): Promise<ParsedUser> => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const id = `temp-${index}-${Date.now()}`;

    // Validate required fields
    if (!row.first_name?.trim()) {
      errors.push({ field: 'first_name', message: 'First name is required' });
    }
    if (!row.last_name?.trim()) {
      errors.push({ field: 'last_name', message: 'Last name is required' });
    }
    if (!row.email?.trim()) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!validateEmail(row.email).isValid) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    // Validate role
    const validatedRole = validateRole(row.role);
    if (!validatedRole) {
      errors.push({
        field: 'role',
        message: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}`
      });
    }

    // Validate mobile (optional)
    let normalizedMobile: string | undefined;
    if (row.mobile) {
      const phoneResult = normalizeNZMobile(row.mobile);
      if (!phoneResult.isValid) {
        warnings.push({
          field: 'mobile',
          message: phoneResult.error || 'Invalid phone format'
        });
      } else {
        normalizedMobile = phoneResult.normalized || undefined;
      }
    }

    // Check if email already exists
    if (row.email && validateEmail(row.email).isValid) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', row.email.toLowerCase().trim())
        .maybeSingle();

      if (existingProfile) {
        errors.push({ field: 'email', message: 'Email already exists in system' });
      }

      const { data: existingInvitation } = await supabase
        .from('pending_invitations')
        .select('id, email, status')
        .eq('email', row.email.toLowerCase().trim())
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvitation) {
        errors.push({ field: 'email', message: 'Pending invitation already exists' });
      }
    }

    // Validate office (must match manager's office)
    let officeId: string | undefined;
    const { data: office } = await supabase
      .from('agencies')
      .select('id, name')
      .ilike('name', row.office_name.trim())
      .eq('id', managerOfficeId)
      .maybeSingle();

    if (!office) {
      errors.push({
        field: 'office_name',
        message: 'Office not found or not in your managed offices'
      });
    } else {
      officeId = office.id;
    }

    // Validate team (optional, but must exist if provided)
    let teamId: string | undefined;
    if (row.team_name?.trim() && officeId) {
      const { data: team } = await supabase
        .from('teams')
        .select('id, name')
        .ilike('name', row.team_name.trim())
        .eq('agency_id', officeId)
        .maybeSingle();

      if (!team) {
        errors.push({
          field: 'team_name',
          message: `Team "${row.team_name}" not found in ${row.office_name}`
        });
      } else {
        teamId = team.id;
      }
    } else if (!row.team_name?.trim()) {
      warnings.push({
        field: 'team_name',
        message: 'No team assigned - user will be office-only'
      });
    }

    return {
      ...row,
      id,
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedMobile,
      officeId,
      teamId,
      validatedRole: validatedRole || undefined,
      isSelected: errors.length === 0, // Auto-select valid users
    };
  };

  const parseCSV = async (file: File, managerOfficeId: string): Promise<void> => {
    setIsParsing(true);
    
    try {
      Papa.parse<CSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_'),
        complete: async (results) => {
          const validated = await Promise.all(
            results.data.map((row, index) => validateUser(row, index, managerOfficeId))
          );
          setParsedUsers(validated);
          setIsParsing(false);
        },
        error: (error) => {
          console.error('CSV Parse Error:', error);
          setIsParsing(false);
        },
      });
    } catch (error) {
      console.error('File processing error:', error);
      setIsParsing(false);
    }
  };

  const updateUser = (id: string, updates: Partial<ParsedUser>) => {
    setParsedUsers(users =>
      users.map(user => (user.id === id ? { ...user, ...updates } : user))
    );
  };

  const removeUser = (id: string) => {
    setParsedUsers(users => users.filter(user => user.id !== id));
  };

  const toggleSelection = (id: string) => {
    setParsedUsers(users =>
      users.map(user =>
        user.id === id ? { ...user, isSelected: !user.isSelected } : user
      )
    );
  };

  const selectAll = (validOnly: boolean = false) => {
    setParsedUsers(users =>
      users.map(user => ({
        ...user,
        isSelected: validOnly ? user.isValid : true,
      }))
    );
  };

  const deselectAll = () => {
    setParsedUsers(users =>
      users.map(user => ({ ...user, isSelected: false }))
    );
  };

  const reset = () => {
    setParsedUsers([]);
  };

  const stats = {
    total: parsedUsers.length,
    valid: parsedUsers.filter(u => u.isValid).length,
    withWarnings: parsedUsers.filter(u => u.warnings.length > 0 && u.isValid).length,
    withErrors: parsedUsers.filter(u => !u.isValid).length,
    selected: parsedUsers.filter(u => u.isSelected).length,
  };

  return {
    isParsing,
    parsedUsers,
    stats,
    parseCSV,
    updateUser,
    removeUser,
    toggleSelection,
    selectAll,
    deselectAll,
    reset,
  };
};
