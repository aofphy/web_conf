import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Event as EventIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { conferenceApi } from '../services/conferenceApi';
import { Conference } from '../types/conference';
import SessionSchedule from '../components/SessionSchedule';
import RegistrationInfo from '../components/RegistrationInfo';
import ProgramGuide from '../components/ProgramGuide';

const ConferenceInfo: React.FC = () => {
  const {
    data: conference,
    isLoading,
    error,
  } = useQuery<Conference>({
    queryKey: ['activeConference'],
    queryFn: conferenceApi.getActiveConference,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading conference information...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load conference information. Please try again later.
        </Alert>
      </Container>
    );
  }

  if (!conference) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          No active conference found. Please check back later.
        </Alert>
      </Container>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Conference Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom>
          {conference.name}
        </Typography>
        {conference.description && (
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            {conference.description}
          </Typography>
        )}
        <Chip
          label={conference.isActive ? 'Active Conference' : 'Inactive'}
          color={conference.isActive ? 'success' : 'default'}
        />
      </Box>

      <Grid container spacing={4}>
        {/* Conference Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <EventIcon sx={{ mr: 1 }} />
                Conference Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ScheduleIcon sx={{ mr: 1, fontSize: 20 }} />
                  Conference Dates
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {formatDate(conference.startDate)} - {formatDate(conference.endDate)}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationIcon sx={{ mr: 1, fontSize: 20 }} />
                  Venue
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {conference.venue}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AssignmentIcon sx={{ mr: 1, fontSize: 20 }} />
                  Important Deadlines
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Submission Deadline:</strong> {formatDateTime(conference.submissionDeadline)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Registration Deadline:</strong> {formatDateTime(conference.registrationDeadline)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Registration Information */}
        <Grid item xs={12} md={6}>
          <RegistrationInfo 
            conferenceId={conference.id}
            registrationFees={conference.registrationFees}
            paymentInstructions={conference.paymentInstructions}
          />
        </Grid>

        {/* Program Guide */}
        <Grid item xs={12}>
          <ProgramGuide conference={conference} />
        </Grid>

        {/* Session Information */}
        <Grid item xs={12}>
          <SessionSchedule 
            sessions={conference.sessions}
            conferenceId={conference.id}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default ConferenceInfo;