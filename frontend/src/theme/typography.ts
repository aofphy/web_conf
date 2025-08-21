// Enhanced Typography System for Academic Conference
export const typography = {
  // Primary font for headings - Professional and modern
  fontFamily: {
    primary: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    secondary: '"Source Sans Pro", "Open Sans", sans-serif',
    monospace: '"Fira Code", "Monaco", "Consolas", monospace',
    academic: '"Crimson Text", "Times New Roman", serif' // For academic content
  },

  // Font weights
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    extraBold: 800
  },

  // Font sizes with responsive scaling
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem'  // 60px
  },

  // Line heights for readability
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  }
};

// Typography components
export const typographyStyles = {
  // Main headings
  h1: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
    marginBottom: '1.5rem'
  },

  h2: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.semiBold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
    marginBottom: '1.25rem'
  },

  h3: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semiBold,
    lineHeight: typography.lineHeight.snug,
    marginBottom: '1rem'
  },

  // Body text
  body1: {
    fontFamily: typography.fontFamily.secondary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.relaxed
  },

  body2: {
    fontFamily: typography.fontFamily.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal
  },

  // Academic content
  academic: {
    fontFamily: typography.fontFamily.academic,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.loose,
    textAlign: 'justify' as const
  },

  // Special text styles
  caption: {
    fontFamily: typography.fontFamily.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide
  },

  overline: {
    fontFamily: typography.fontFamily.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    lineHeight: typography.lineHeight.normal,
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.widest
  }
};