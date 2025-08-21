import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import { Save, Edit, Cancel } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';

export default function Profile() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    affiliation: user?.affiliation || '',
    country: user?.country || '',
    bio: user?.bio || '',
    expertise: user?.expertise || [],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      showSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      showError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      affiliation: user?.affiliation || '',
      country: user?.country || '',
      bio: user?.bio || '',
      expertise: user?.expertise || [],
    });
    setIsEditing(false);
  };

  if (!user) {
    return (
      <Container maxWidth="md">
        <Alert severity="warning">
          Please log in to view your profile.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            My Profile
          </Typography>
          {!isEditing ? (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={loading}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={!isEditing}
              variant={isEditing ? "outlined" : "filled"}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={!isEditing}
              variant={isEditing ? "outlined" : "filled"}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              value={user.email}
              disabled
              variant="filled"
              helperText="Email cannot be changed"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Affiliation"
              name="affiliation"
              value={formData.affiliation}
              onChange={handleInputChange}
              disabled={!isEditing}
              variant={isEditing ? "outlined" : "filled"}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              disabled={!isEditing}
              variant={isEditing ? "outlined" : "filled"}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              disabled={!isEditing}
              variant={isEditing ? "outlined" : "filled"}
              multiline
              rows={4}
              placeholder="Tell us about yourself and your research interests..."
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Registration Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Participant Type
              </Typography>
              <Chip 
                label={user.participantType.replace('_', ' ').toUpperCase()} 
                color="primary" 
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Role
              </Typography>
              <Chip 
                label={user.role.toUpperCase()} 
                color="secondary" 
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Payment Status
              </Typography>
              <Chip 
                label={user.paymentStatus.replace('_', ' ').toUpperCase()} 
                color={user.paymentStatus === 'payment_verified' ? 'success' : 'warning'}
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Registration Fee
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                ${user.registrationFee}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Selected Sessions
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {user.selectedSessions.map((session) => (
              <Chip
                key={session}
                label={session}
                color="info"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}