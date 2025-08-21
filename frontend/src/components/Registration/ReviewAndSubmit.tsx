import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { RegistrationData } from './RegistrationWizard';

interface ReviewAndSubmitProps {
  data: RegistrationData;
  onEdit: (step: number) => void;
}

export const ReviewAndSubmit: React.FC<ReviewAndSubmitProps> = ({
  data,
  onEdit,
}) => {
  const getParticipantTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRegistrationFee = () => {
    // This would normally come from the backend based on participant type
    const feeMap: Record<string, number> = {
      keynote_speaker: 0,
      oral_presenter: 150,
      poster_presenter: 120,
      panelist: 100,
      workshop_leader: 80,
      regular_participant: 200,
      observer: 100,
      industry_representative: 250,
      conference_chair: 0,
      scientific_committee: 0,
      organizing_committee: 50,
      session_chair: 75,
      reviewer: 50,
      technical_support: 25,
      volunteer: 0,
      sponsor: 0,
      government_representative: 150,
    };
    
    return feeMap[data.participantType || ''] || 0;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Review Your Registration
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Please review your information before submitting your registration.
      </Typography>

      <Grid container spacing={3}>
        {/* Participant Type */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Participant Type</Typography>
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => onEdit(0)}
                >
                  Edit
                </Button>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={getParticipantTypeLabel(data.participantType || '')}
                  color="primary"
                  size="large"
                />
                <Typography variant="h6" color="success.main">
                  Registration Fee: ${getRegistrationFee()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Personal Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Personal Information</Typography>
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => onEdit(1)}
                >
                  Edit
                </Button>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Name</Typography>
                  <Typography variant="body1">{data.firstName} {data.lastName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{data.email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Affiliation</Typography>
                  <Typography variant="body1">{data.affiliation}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Country</Typography>
                  <Typography variant="body1">{data.country}</Typography>
                </Grid>
                {data.bio && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Bio</Typography>
                    <Typography variant="body1">{data.bio}</Typography>
                  </Grid>
                )}
                {data.expertise.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Areas of Expertise
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {data.expertise.map((area) => (
                        <Chip key={area} label={area} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Session Selection */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Selected Sessions</Typography>
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => onEdit(2)}
                >
                  Edit
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {data.selectedSessions.map((session) => (
                  <Chip
                    key={session}
                    label={session}
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Terms and Conditions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Terms and Conditions
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Registration Confirmation"
                    secondary="You will receive a confirmation email after successful registration."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Payment"
                    secondary="Registration fee must be paid within 7 days to secure your spot."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Cancellation Policy"
                    secondary="Cancellations made 30 days before the conference are eligible for a full refund."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Code of Conduct"
                    secondary="All participants must adhere to the conference code of conduct."
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Registration Summary
        </Typography>
        <Typography variant="body1">
          Participant Type: <strong>{getParticipantTypeLabel(data.participantType || '')}</strong>
        </Typography>
        <Typography variant="body1">
          Selected Sessions: <strong>{data.selectedSessions.length}</strong>
        </Typography>
        <Typography variant="h5" color="primary" sx={{ mt: 1 }}>
          Total Fee: ${getRegistrationFee()}
        </Typography>
      </Box>
    </Box>
  );
};