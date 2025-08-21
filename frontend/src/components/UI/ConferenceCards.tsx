import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Typography,
  Button,
  Chip,
  Box,
  Avatar,
  IconButton,
  Divider,
  LinearProgress
} from '@mui/material';
import { ConferenceIcon } from './IconSystem';
import { OptimizedImage, ConferenceAvatar } from './ImageSystem';

// Base card component with consistent styling
export const ConferenceCard: React.FC<{
  children: React.ReactNode;
  elevation?: number;
  hover?: boolean;
  className?: string;
}> = ({ children, elevation = 1, hover = true, className }) => {
  return (
    <Card
      elevation={elevation}
      className={className}
      sx={{
        borderRadius: 2,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(hover && {
          '&:hover': {
            elevation: 4,
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
          }
        })
      }}
    >
      {children}
    </Card>
  );
};

// Session card for displaying conference sessions
export const SessionCard: React.FC<{
  title: string;
  description: string;
  type: string;
  startTime: string;
  endTime: string;
  location: string;
  speakers?: Array<{ name: string; avatar?: string }>;
  onRegister?: () => void;
}> = ({ title, description, type, startTime, endTime, location, speakers, onRegister }) => {
  return (
    <ConferenceCard>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600, flex: 1 }}>
            {title}
          </Typography>
          <Chip
            label={type}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ConferenceIcon name="schedule" size="sm" color="primary" />
            <Typography variant="body2">
              {startTime} - {endTime}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ConferenceIcon name="location" size="sm" color="primary" />
            <Typography variant="body2">
              {location}
            </Typography>
          </Box>
        </Box>
        
        {speakers && speakers.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Speakers:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {speakers.slice(0, 3).map((speaker, index) => (
                <ConferenceAvatar
                  key={index}
                  src={speaker.avatar}
                  name={speaker.name}
                  size="small"
                />
              ))}
              {speakers.length > 3 && (
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                  +{speakers.length - 3}
                </Avatar>
              )}
            </Box>
          </Box>
        )}
      </CardContent>
      
      {onRegister && (
        <CardActions>
          <Button
            variant="contained"
            size="small"
            onClick={onRegister}
            startIcon={<ConferenceIcon name="add" size="sm" />}
          >
            Register
          </Button>
        </CardActions>
      )}
    </ConferenceCard>
  );
};

// Submission card for displaying paper submissions
export const SubmissionCard: React.FC<{
  title: string;
  authors: string[];
  abstract: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
  submissionDate: string;
  sessionType: string;
  presentationType: 'oral' | 'poster';
  onView?: () => void;
  onEdit?: () => void;
  onDownload?: () => void;
}> = ({ 
  title, 
  authors, 
  abstract, 
  status, 
  submissionDate, 
  sessionType, 
  presentationType,
  onView,
  onEdit,
  onDownload 
}) => {
  const statusColors = {
    submitted: 'info',
    under_review: 'warning',
    accepted: 'success',
    rejected: 'error'
  } as const;

  const statusLabels = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    accepted: 'Accepted',
    rejected: 'Rejected'
  };

  return (
    <ConferenceCard>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600, flex: 1 }}>
            {title}
          </Typography>
          <Chip
            label={statusLabels[status]}
            size="small"
            color={statusColors[status]}
            sx={{ ml: 1 }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <strong>Authors:</strong> {authors.join(', ')}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {abstract.length > 150 ? `${abstract.substring(0, 150)}...` : abstract}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip label={sessionType} size="small" variant="outlined" />
          <Chip 
            label={presentationType} 
            size="small" 
            variant="outlined"
            color={presentationType === 'oral' ? 'primary' : 'secondary'}
          />
        </Box>
        
        <Typography variant="caption" color="text.secondary">
          Submitted: {submissionDate}
        </Typography>
      </CardContent>
      
      <CardActions>
        {onView && (
          <Button
            size="small"
            onClick={onView}
            startIcon={<ConferenceIcon name="view" size="sm" />}
          >
            View
          </Button>
        )}
        {onEdit && status === 'submitted' && (
          <Button
            size="small"
            onClick={onEdit}
            startIcon={<ConferenceIcon name="edit" size="sm" />}
          >
            Edit
          </Button>
        )}
        {onDownload && (
          <IconButton
            size="small"
            onClick={onDownload}
            title="Download manuscript"
          >
            <ConferenceIcon name="download" size="sm" />
          </IconButton>
        )}
      </CardActions>
    </ConferenceCard>
  );
};

// Statistics card for dashboard
export const StatsCard: React.FC<{
  title: string;
  value: number | string;
  icon: keyof typeof import('./IconSystem').ConferenceIcons;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}> = ({ title, value, icon, color = 'primary', trend, loading }) => {
  return (
    <ConferenceCard hover={false}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: `${color}.main` }}>
              {loading ? '-' : value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <ConferenceIcon 
                  name={trend.isPositive ? 'expand' : 'collapse'} 
                  size="sm" 
                  color={trend.isPositive ? 'success' : 'error'} 
                />
                <Typography 
                  variant="caption" 
                  color={trend.isPositive ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend.value)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 2,
              backgroundColor: `${color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ConferenceIcon name={icon} size="lg" color={color} />
          </Box>
        </Box>
        {loading && <LinearProgress sx={{ mt: 2 }} />}
      </CardContent>
    </ConferenceCard>
  );
};

// Profile card for user information
export const ProfileCard: React.FC<{
  name: string;
  email: string;
  affiliation: string;
  country: string;
  participantType: string;
  avatar?: string;
  onEdit?: () => void;
}> = ({ name, email, affiliation, country, participantType, avatar, onEdit }) => {
  return (
    <ConferenceCard>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ConferenceAvatar src={avatar} name={name} size="large" />
          <Box sx={{ ml: 2, flex: 1 }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              {name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {email}
            </Typography>
          </Box>
          {onEdit && (
            <IconButton onClick={onEdit} size="small">
              <ConferenceIcon name="edit" size="sm" />
            </IconButton>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConferenceIcon name="academic" size="sm" color="primary" />
            <Typography variant="body2">
              <strong>Affiliation:</strong> {affiliation}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConferenceIcon name="international" size="sm" color="primary" />
            <Typography variant="body2">
              <strong>Country:</strong> {country}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConferenceIcon name="participant" size="sm" color="primary" />
            <Typography variant="body2">
              <strong>Type:</strong> {participantType}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </ConferenceCard>
  );
};