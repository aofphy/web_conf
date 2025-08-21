import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Divider,
  Alert,
} from '@mui/material';
import { Login as LoginIcon, PersonAdd } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/Layout/LoadingSpinner';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    affiliation: '',
    country: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // TODO: Implement actual API calls
      if (isLogin) {
        // Mock login
        const mockUser = {
          id: '1',
          email: formData.email,
          firstName: 'John',
          lastName: 'Doe',
          affiliation: 'University',
          country: 'USA',
          participantType: 'regular_participant' as const,
          role: 'participant' as const,
          registrationDate: new Date(),
          isActive: true,
          paymentStatus: 'not_paid' as const,
          registrationFee: 100,
          selectedSessions: ['CHE' as const],
          createdAt: new Date(),
        };
        
        login(mockUser, 'mock-token');
        navigate('/');
      } else {
        // Mock registration
        setIsLogin(true);
        setError('Registration successful! Please log in.');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Authenticating..." />;
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isLogin ? <LoginIcon sx={{ fontSize: 40, mb: 2 }} /> : <PersonAdd sx={{ fontSize: 40, mb: 2 }} />}
            <Typography component="h1" variant="h4" gutterBottom>
              {isLogin ? 'Sign In' : 'Register'}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              {isLogin 
                ? 'Welcome back to the International Academic Conference'
                : 'Join the International Academic Conference'
              }
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              {!isLogin && (
                <>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="firstName"
                      label="First Name"
                      name="firstName"
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="lastName"
                      label="Last Name"
                      name="lastName"
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </Box>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="affiliation"
                    label="Affiliation"
                    name="affiliation"
                    value={formData.affiliation}
                    onChange={handleInputChange}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="country"
                    label="Country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                  />
                </>
              )}
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus={isLogin}
                value={formData.email}
                onChange={handleInputChange}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={formData.password}
                onChange={handleInputChange}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {isLogin ? 'Sign In' : 'Register'}
              </Button>
              
              <Divider sx={{ my: 2 }} />
              
              <Box textAlign="center">
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  type="button"
                >
                  {isLogin 
                    ? "Don't have an account? Sign Up"
                    : "Already have an account? Sign In"
                  }
                </Link>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}