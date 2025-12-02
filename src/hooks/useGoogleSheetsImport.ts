import { useState } from 'react';

interface GoogleSheetRow {
  [key: string]: string;
}

interface UseGoogleSheetsImportReturn {
  fetchGoogleSheet: (url: string) => Promise<GoogleSheetRow[]>;
  isFetching: boolean;
  error: string | null;
}

export const useGoogleSheetsImport = (): UseGoogleSheetsImportReturn => {
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Extract Sheet ID from various Google Sheets URL formats
   * Supports:
   * - https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
   * - https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid=0
   * - https://docs.google.com/spreadsheets/d/{SHEET_ID}
   * - Direct sheet ID
   */
  const extractSheetId = (url: string): string | null => {
    // Check if it's already a sheet ID (no slashes, alphanumeric with dashes/underscores)
    if (/^[\w-]+$/.test(url) && url.length > 20) {
      return url;
    }

    // Try to extract from URL
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  /**
   * Fetch data from a public Google Sheet using opensheet.elk.sh
   * This free API returns JSON from public Google Sheets without requiring authentication
   */
  const fetchGoogleSheet = async (url: string): Promise<GoogleSheetRow[]> => {
    setIsFetching(true);
    setError(null);

    try {
      const sheetId = extractSheetId(url.trim());
      
      if (!sheetId) {
        throw new Error('Invalid Google Sheets URL. Please paste a valid Google Sheets link.');
      }

      // Use opensheet.elk.sh - a free API that converts public Google Sheets to JSON
      // It uses the first sheet by default (sheet number 1)
      const apiUrl = `https://opensheet.elk.sh/${sheetId}/1`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Sheet not found. Make sure the sheet is shared as "Anyone with the link can view".');
        }
        throw new Error(`Failed to fetch sheet: ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid response from Google Sheets. Make sure your sheet has data with headers in the first row.');
      }

      if (data.length === 0) {
        throw new Error('The Google Sheet appears to be empty. Please add data with headers in the first row.');
      }

      setIsFetching(false);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Google Sheet';
      setError(errorMessage);
      setIsFetching(false);
      throw new Error(errorMessage);
    }
  };

  return {
    fetchGoogleSheet,
    isFetching,
    error
  };
};
