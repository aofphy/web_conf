import React from 'react';
import {
  School,
  Science,
  Groups,
  Event,
  Description,
  Payment,
  Assessment,
  AdminPanelSettings,
  Person,
  Upload,
  Download,
  CheckCircle,
  Error,
  Warning,
  Info,
  Star,
  Award,
  Public,
  Language,
  Schedule,
  LocationOn,
  Email,
  Phone,
  Link as LinkIcon,
  Share,
  Print,
  Bookmark,
  Favorite,
  Visibility,
  Edit,
  Delete,
  Add,
  Remove,
  Search,
  Filter,
  Sort,
  Refresh,
  Settings,
  Help,
  Menu,
  Close,
  ArrowBack,
  ArrowForward,
  ExpandMore,
  ExpandLess,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';

// Conference-specific icons mapping
export const ConferenceIcons = {
  // Main categories
  academic: School,
  research: Science,
  community: Groups,
  event: Event,
  
  // Content types
  abstract: Description,
  manuscript: Description,
  presentation: Assessment,
  poster: Assessment,
  
  // User roles
  participant: Person,
  presenter: Person,
  reviewer: Assessment,
  admin: AdminPanelSettings,
  organizer: Groups,
  
  // Actions
  submit: Upload,
  download: Download,
  edit: Edit,
  delete: Delete,
  add: Add,
  remove: Remove,
  
  // Status indicators
  success: CheckCircle,
  error: Error,
  warning: Warning,
  info: Info,
  pending: Schedule,
  
  // Awards and recognition
  award: Award,
  star: Star,
  featured: Star,
  
  // Location and contact
  location: LocationOn,
  email: Email,
  phone: Phone,
  website: LinkIcon,
  
  // Social and sharing
  share: Share,
  print: Print,
  bookmark: Bookmark,
  favorite: Favorite,
  
  // Navigation
  menu: Menu,
  close: Close,
  back: ArrowBack,
  forward: ArrowForward,
  expand: ExpandMore,
  collapse: ExpandLess,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  
  // Utility
  search: Search,
  filter: Filter,
  sort: Sort,
  refresh: Refresh,
  settings: Settings,
  help: Help,
  view: Visibility,
  
  // Conference specific
  schedule: Schedule,
  payment: Payment,
  international: Public,
  multilingual: Language
};

// Icon sizes
export const IconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64
};

// Icon component with consistent styling
interface ConferenceIconProps {
  name: keyof typeof ConferenceIcons;
  size?: keyof typeof IconSizes;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'inherit';
  className?: string;
}

export const ConferenceIcon: React.FC<ConferenceIconProps> = ({
  name,
  size = 'md',
  color = 'inherit',
  className
}) => {
  const IconComponent = ConferenceIcons[name];
  const iconSize = IconSizes[size];
  
  return (
    <IconComponent
      sx={{
        fontSize: iconSize,
        color: color === 'inherit' ? 'inherit' : `${color}.main`
      }}
      className={className}
    />
  );
};

// Animated icon wrapper
export const AnimatedIcon: React.FC<ConferenceIconProps & {
  animation?: 'spin' | 'pulse' | 'bounce' | 'shake';
}> = ({ animation, ...props }) => {
  const animations = {
    spin: {
      animation: 'spin 1s linear infinite',
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
      }
    },
    pulse: {
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      '@keyframes pulse': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.5 }
      }
    },
    bounce: {
      animation: 'bounce 1s infinite',
      '@keyframes bounce': {
        '0%, 100%': { transform: 'translateY(-25%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
        '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' }
      }
    },
    shake: {
      animation: 'shake 0.5s ease-in-out',
      '@keyframes shake': {
        '0%, 100%': { transform: 'translateX(0)' },
        '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
        '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' }
      }
    }
  };

  return (
    <div style={animation ? animations[animation] : undefined}>
      <ConferenceIcon {...props} />
    </div>
  );
};