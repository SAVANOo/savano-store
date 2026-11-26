export const colors = {
  // Pure Ink & Ivory (Studio) base surfaces
  bg: '#050506',
  surface: '#121215',
  surfaceElevated: '#18181D',
  surfaceHighlight: '#1E1E24',
  border: '#232329',
  borderStrong: '#2E2E36',

  // Studio accents: Ivory & Vibrant Green
  ivory: '#F8FAFC',
  ivoryMuted: 'rgba(248, 250, 252, 0.12)',
  emerald: '#22C55E',
  emeraldDeep: '#16A34A',
  emeraldMuted: 'rgba(34, 197, 94, 0.14)',
  gold: '#22C55E',
  goldSoft: '#4ADE80',
  goldMuted: 'rgba(34, 197, 94, 0.14)',

  // Text hierarchy
  textPrimary: '#F8FAFC',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

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
