/**
 * Address matching utility for Beacon Historic Import
 * Implements smart matching with confidence levels
 */

export type MatchConfidence = 'high' | 'medium' | 'low' | 'none';

export interface AddressMatch {
  beaconReportId: string;
  beaconAddress: string;
  appraisalId: string;
  appraisalAddress: string;
  confidence: MatchConfidence;
  score: number;
}

// Common NZ street type abbreviations and their variations
const streetTypeMap: Record<string, string[]> = {
  'road': ['rd', 'road'],
  'street': ['st', 'str', 'street'],
  'avenue': ['ave', 'av', 'avenue'],
  'drive': ['dr', 'drv', 'drive'],
  'place': ['pl', 'place'],
  'crescent': ['cres', 'cr', 'crescent'],
  'terrace': ['tce', 'terr', 'terrace'],
  'lane': ['ln', 'lane'],
  'court': ['ct', 'court'],
  'close': ['cl', 'close'],
  'way': ['way'],
  'parade': ['pde', 'parade'],
  'grove': ['gr', 'grove'],
  'heights': ['hts', 'heights'],
  'circuit': ['cct', 'circuit'],
};

/**
 * Normalize an address for comparison
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  let normalized = address
    .toLowerCase()
    .trim()
    // Remove punctuation except hyphens in unit numbers
    .replace(/[.,;:'"!?()]/g, '')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    // Remove "new zealand" or "nz" suffix
    .replace(/,?\s*(new zealand|nz)\s*$/i, '')
    // Remove postcode (4 digits at end)
    .replace(/\s+\d{4}\s*$/, '');

  // Standardize street types to full form
  for (const [standard, variations] of Object.entries(streetTypeMap)) {
    for (const variation of variations) {
      // Match as whole word at end or before comma/suburb
      const regex = new RegExp(`\\b${variation}\\b(?=\\s*,|\\s+[a-z]+|$)`, 'gi');
      normalized = normalized.replace(regex, standard);
    }
  }

  // Standardize unit/flat prefixes
  normalized = normalized
    .replace(/^unit\s+/i, '')
    .replace(/^flat\s+/i, '')
    .replace(/^apt\.?\s+/i, '')
    .replace(/^apartment\s+/i, '');

  return normalized.trim();
}

/**
 * Extract street number and name from address
 */
function extractStreetParts(address: string): { number: string; street: string; unit?: string } {
  const normalized = normalizeAddress(address);
  
  // Try to match unit number pattern: "1/23" or "1a/23"
  const unitMatch = normalized.match(/^(\d+[a-z]?)\/(\d+[a-z]?)\s+(.+)/i);
  if (unitMatch) {
    return {
      unit: unitMatch[1],
      number: unitMatch[2],
      street: unitMatch[3].split(',')[0].trim()
    };
  }
  
  // Standard pattern: "123 Some Street"
  const standardMatch = normalized.match(/^(\d+[a-z]?)\s+(.+)/i);
  if (standardMatch) {
    return {
      number: standardMatch[1],
      street: standardMatch[2].split(',')[0].trim()
    };
  }
  
  return { number: '', street: normalized.split(',')[0].trim() };
}

/**
 * Calculate match score between two addresses (0-100)
 */
export function calculateMatchScore(address1: string, address2: string): number {
  if (!address1 || !address2) return 0;
  
  const norm1 = normalizeAddress(address1);
  const norm2 = normalizeAddress(address2);
  
  // Exact match after normalization
  if (norm1 === norm2) return 100;
  
  const parts1 = extractStreetParts(address1);
  const parts2 = extractStreetParts(address2);
  
  let score = 0;
  
  // Street number match (most important)
  if (parts1.number && parts2.number) {
    if (parts1.number === parts2.number) {
      score += 40;
    } else if (parts1.number.replace(/[a-z]/gi, '') === parts2.number.replace(/[a-z]/gi, '')) {
      // Number matches but letter suffix differs (e.g., 23 vs 23A)
      score += 25;
    }
  }
  
  // Street name match
  if (parts1.street && parts2.street) {
    // Exact street match
    if (parts1.street === parts2.street) {
      score += 40;
    } else {
      // Calculate Levenshtein-based similarity
      const similarity = calculateStringSimilarity(parts1.street, parts2.street);
      score += Math.round(similarity * 40);
    }
  }
  
  // Unit number handling
  if (parts1.unit && parts2.unit) {
    if (parts1.unit === parts2.unit) {
      score += 20;
    }
  } else if (!parts1.unit && !parts2.unit) {
    // Both have no unit - slight boost
    score += 10;
  }
  
  // Suburb matching (extract from comma-separated parts)
  const suburb1 = extractSuburb(address1);
  const suburb2 = extractSuburb(address2);
  if (suburb1 && suburb2 && suburb1 === suburb2) {
    score += 10;
  }
  
  return Math.min(100, score);
}

/**
 * Extract suburb from address (typically second part after comma)
 */
function extractSuburb(address: string): string {
  const parts = address.toLowerCase().split(',');
  if (parts.length >= 2) {
    return parts[1].trim().replace(/\s+\d{4}$/, ''); // Remove postcode
  }
  return '';
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Determine confidence level from score
 */
export function getConfidenceLevel(score: number): MatchConfidence {
  if (score >= 95) return 'high';
  if (score >= 80) return 'medium';
  if (score >= 60) return 'low';
  return 'none';
}

/**
 * Match Beacon reports to existing appraisals
 */
export function matchReportsToAppraisals(
  beaconReports: Array<{ id: string; address: string; ownerName?: string; ownerEmail?: string }>,
  appraisals: Array<{ id: string; address: string; vendor_name?: string; vendor_email?: string }>
): AddressMatch[] {
  const matches: AddressMatch[] = [];
  
  for (const report of beaconReports) {
    let bestMatch: AddressMatch | null = null;
    let bestScore = 0;
    
    for (const appraisal of appraisals) {
      const score = calculateMatchScore(report.address, appraisal.address);
      
      // Bonus for matching vendor name
      let adjustedScore = score;
      if (report.ownerName && appraisal.vendor_name) {
        const nameSimilarity = calculateStringSimilarity(
          report.ownerName.toLowerCase(),
          appraisal.vendor_name.toLowerCase()
        );
        adjustedScore += Math.round(nameSimilarity * 10);
      }
      
      // Bonus for matching email
      if (report.ownerEmail && appraisal.vendor_email) {
        if (report.ownerEmail.toLowerCase() === appraisal.vendor_email.toLowerCase()) {
          adjustedScore += 15;
        }
      }
      
      adjustedScore = Math.min(100, adjustedScore);
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMatch = {
          beaconReportId: report.id,
          beaconAddress: report.address,
          appraisalId: appraisal.id,
          appraisalAddress: appraisal.address,
          confidence: getConfidenceLevel(adjustedScore),
          score: adjustedScore,
        };
      }
    }
    
    if (bestMatch && bestMatch.confidence !== 'none') {
      matches.push(bestMatch);
    }
  }
  
  return matches;
}
