import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Levenshtein distance algorithm for string similarity
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return ((maxLength - distance) / maxLength) * 100;
}

export interface DuplicateMatch {
  provider: any;
  matchType: 'exact' | 'high' | 'uncertain';
  matchReason: string;
  similarity?: number;
}

export interface DuplicateCheckData {
  full_name: string;
  company_name?: string;
  phone?: string;
  email?: string;
}

export const useDuplicateDetection = (checkData: DuplicateCheckData | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['duplicate-detection', checkData],
    queryFn: async () => {
      if (!checkData || !user) return null;

      // Fetch all office providers
      const { data: providers, error } = await supabase
        .from('service_providers')
        .select('*');

      if (error) throw error;
      if (!providers || providers.length === 0) return null;

      const matches: DuplicateMatch[] = [];

      for (const provider of providers) {
        // EXACT MATCHES
        
        // Same name + company
        if (
          checkData.full_name.toLowerCase().trim() === (provider.name || '').toLowerCase().trim() &&
          checkData.company_name &&
          provider.company &&
          checkData.company_name.toLowerCase().trim() === provider.company.toLowerCase().trim()
        ) {
          matches.push({
            provider,
            matchType: 'exact',
            matchReason: 'Same name and company',
          });
          continue;
        }

        // Same phone
        if (
          checkData.phone &&
          provider.phone &&
          checkData.phone.replace(/\s+/g, '') === provider.phone.replace(/\s+/g, '')
        ) {
          matches.push({
            provider,
            matchType: 'exact',
            matchReason: 'Same phone number',
          });
          continue;
        }

        // Same email
        if (
          checkData.email &&
          provider.email &&
          checkData.email.toLowerCase().trim() === provider.email.toLowerCase().trim()
        ) {
          matches.push({
            provider,
            matchType: 'exact',
            matchReason: 'Same email address',
          });
          continue;
        }

        // HIGH SIMILARITY
        const nameSimilarity = calculateSimilarity(checkData.full_name, provider.name || '');
        
        if (nameSimilarity >= 85) {
          matches.push({
            provider,
            matchType: 'high',
            matchReason: `Very similar name (${Math.round(nameSimilarity)}% match)`,
            similarity: nameSimilarity,
          });
          continue;
        }

        // UNCERTAIN MATCH
        if (nameSimilarity >= 60) {
          matches.push({
            provider,
            matchType: 'uncertain',
            matchReason: `Possibly similar name (${Math.round(nameSimilarity)}% match)`,
            similarity: nameSimilarity,
          });
        }
      }

      // Sort by match severity
      matches.sort((a, b) => {
        const priority = { exact: 3, high: 2, uncertain: 1 };
        return priority[b.matchType] - priority[a.matchType];
      });

      return matches.length > 0 ? matches[0] : null; // Return most severe match
    },
    enabled: !!checkData && !!user && !!checkData.full_name,
  });
};
