// Consistent spacing system for the conference website
export const spacing = {
  // Base unit (8px) - Material Design standard
  unit: 8,
  
  // Spacing scale
  xs: 4,    // 0.25rem
  sm: 8,    // 0.5rem
  md: 16,   // 1rem
  lg: 24,   // 1.5rem
  xl: 32,   // 2rem
  '2xl': 48, // 3rem
  '3xl': 64, // 4rem
  '4xl': 96, // 6rem
  '5xl': 128 // 8rem
};

// Component-specific spacing
export const componentSpacing = {
  // Card spacing
  card: {
    padding: spacing.lg,
    margin: spacing.md,
    gap: spacing.md
  },
  
  // Form spacing
  form: {
    fieldGap: spacing.lg,
    sectionGap: spacing.xl,
    buttonGap: spacing.md
  },
  
  // Navigation spacing
  navigation: {
    itemPadding: spacing.md,
    itemGap: spacing.sm,
    sectionGap: spacing.lg
  },
  
  // Content spacing
  content: {
    paragraphGap: spacing.md,
    sectionGap: spacing.xl,
    headingGap: spacing.lg
  },
  
  // Layout spacing
  layout: {
    containerPadding: spacing.lg,
    sectionPadding: spacing['2xl'],
    headerHeight: 64,
    footerHeight: 200,
    sidebarWidth: 280
  }
};

// Responsive spacing utilities
export const responsiveSpacing = {
  // Mobile-first responsive spacing
  mobile: {
    padding: spacing.md,
    margin: spacing.sm,
    gap: spacing.sm
  },
  
  tablet: {
    padding: spacing.lg,
    margin: spacing.md,
    gap: spacing.md
  },
  
  desktop: {
    padding: spacing.xl,
    margin: spacing.lg,
    gap: spacing.lg
  }
};

// Grid system
export const grid = {
  // Container max widths
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  },
  
  // Column system
  columns: 12,
  gutter: spacing.lg,
  
  // Breakpoints (matches Material-UI)
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536
  }
};