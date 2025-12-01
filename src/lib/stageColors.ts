// Opportunity stage color constants
export const STAGE_COLORS = {
  call: { 
    bg: 'bg-gray-100', 
    text: 'text-gray-600', 
    hex: '#6B7280',
    label: 'Call/SMS'
  },
  vap: { 
    bg: 'bg-blue-100', 
    text: 'text-blue-600', 
    hex: '#3B82F6',
    label: 'VAP'
  },
  map: { 
    bg: 'bg-teal-100', 
    text: 'text-teal-600', 
    hex: '#14B8A6',
    label: 'MAP'
  },
  lap: { 
    bg: 'bg-amber-100', 
    text: 'text-amber-600', 
    hex: '#F59E0B',
    label: 'LAP'
  },
  won: { 
    bg: 'bg-emerald-100', 
    text: 'text-emerald-600', 
    hex: '#10B981',
    label: 'WON'
  },
  lost: { 
    bg: 'bg-red-100', 
    text: 'text-red-600', 
    hex: '#EF4444',
    label: 'LOST'
  },
} as const;

export type OpportunityStage = keyof typeof STAGE_COLORS;

export const getStageColor = (stage: string) => {
  return STAGE_COLORS[stage as OpportunityStage] || STAGE_COLORS.call;
};
