export const colors = {
  // Obsidian base surfaces
  bg: '#090B0E',
  surface: '#11151B',
  surfaceElevated: '#171C24',
  surfaceHighlight: '#1E2530',
  border: '#232A36',
  borderStrong: '#303949',

  // Editorial accents: Emerald & Gold
  emerald: '#10B981',
  emeraldDeep: '#059669',
  emeraldMuted: 'rgba(16, 185, 129, 0.14)',
  gold: '#EAB308',
  goldSoft: '#FACC15',
  goldMuted: 'rgba(234, 179, 8, 0.14)',

  // Text hierarchy
  textPrimary: '#F4F6F8',
  textSecondary: '#A1AAB8',
  textMuted: '#6B7484',

  // Semantic
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.14)',
  info: '#38BDF8',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;
