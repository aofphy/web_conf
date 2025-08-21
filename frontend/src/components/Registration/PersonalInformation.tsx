import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Alert,
} from '@mui/material';
import { RegistrationData } from './RegistrationWizard';

interface PersonalInformationProps {
  data: RegistrationData;
  onChange: (updates: Partial<RegistrationData>) => void;
  errors: Record<string, string>;
}

export const PersonalInformation: React.FC<PersonalInformationProps> = ({
  data,
  onChange,
  errors,
}) => {
  const handleInputChange = (field: keyof RegistrationData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange({ [field]: event.target.value });
  };

  const handleExpertiseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const expertise = event.target.value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    onChange({ expertise });
  };

  const isPresenterType = data.participantType && [
    'keynote_speaker',
    'oral_presenter',
    'poster_presenter',
    'panelist',
    'workshop_leader'
  ].includes(data.participantType);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Personal Information
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Please provide your personal details for registration.
      </Typography>

      {Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Please correct the errors below to continue.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            value={data.firstName}
            onChange={handleInputChange('firstName')}
            error={!!errors.firstName}
            helperText={errors.firstName}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name"
            value={data.lastName}
            onChange={handleInputChange('lastName')}
            error={!!errors.lastName}
            helperText={errors.lastName}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={data.email}
            onChange={handleInputChange('email')}
            error={!!errors.email}
            helperText={errors.email}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={data.password}
            onChange={handleInputChange('password')}
            error={!!errors.password}
            helperText={errors.password || 'Minimum 6 characters'}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Affiliation"
            value={data.affiliation}
            onChange={handleInputChange('affiliation')}
            error={!!errors.affiliation}
            helperText={errors.affiliation || 'University, Company, or Organization'}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Country"
            value={data.country}
            onChange={handleInputChange('country')}
            error={!!errors.country}
            helperText={errors.country}
            required
          />
        </Grid>
        
        {isPresenterType && (
          <>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                multiline
                rows={4}
                value={data.bio}
                onChange={handleInputChange('bio')}
                error={!!errors.bio}
                helperText={errors.bio || 'Brief professional biography (optional for presenters)'}
                placeholder="Tell us about your background, research interests, and professional experience..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Areas of Expertise"
                value={data.expertise.join(', ')}
                onChange={handleExpertiseChange}
                error={!!errors.expertise}
                helperText={errors.expertise || 'Comma-separated list of your research areas and expertise'}
                placeholder="e.g., Machine Learning, Computational Chemistry, Data Analysis"
              />
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
};