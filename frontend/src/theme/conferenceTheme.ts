import { createTheme, ThemeOptions } from '@mui/material/styles';

// Conference branding colors
const conferenceColors = {
  primary: {
    main: '#1565C0', // Deep blue for academic feel
    light: '#42A5F5',
    dark: '#0D47A1',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#FF6F00', // Orange for accent
    light: '#FFB74D',
    dark: '#E65100',
    contrastText: '#ffffff',
  },
  success: {
    main: '#2E7D32',
    light: '#66BB6A',
    dark: '#1B5E20',
  },
  warning: {
    main: '#F57C00',
    light: '#FFB74D',
    dark: '#E65100',
  },
  error: {
    main: '#D32F2F',
    light: '#EF5350',
    dark: '#C62828',
  },
  info: {
    main: '#1976D2',
    light: '#64B5F6',
    dark: '#1565C0',
  },
};

const baseThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    ...conferenceColors,
    background: {
      default: '#F8F9FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212529',
      secondary: '#6C757D',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      marginBottom: '1rem',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.3,
      marginBottom: '0.875rem',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.4,
      marginBottom: '0.75rem',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
      marginBottom: '0.625rem',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
      marginBottom: '0.5rem',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.6,
      marginBottom: '0.5rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
};

const componentOverrides: ThemeOptions['components'] = {
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '8px 16px',
        fontWeight: 500,
      },
      contained: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        '&:hover': {
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
        },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: '1px solid rgba(0, 0, 0, 0.12)',
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        margin: '4px 8px',
        '&.Mui-selected': {
          backgroundColor: 'rgba(21, 101, 192, 0.08)',
          '&:hover': {
            backgroundColor: 'rgba(21, 101, 192, 0.12)',
          },
        },
      },
    },
  },
};

export const conferenceTheme = createTheme({
  ...baseThemeOptions,
  components: componentOverrides,
});

// Dark theme variant for future use
export const conferenceDarkTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'dark',
    ...conferenceColors,
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
    },
  },
  components: componentOverrides,
});