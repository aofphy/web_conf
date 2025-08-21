import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Assignment,
  Payment,
  CheckCircle,
  Warning,
  Error,
  Info,
  Edit,
  Visibility,
  Download,
  Upload,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

interface Submission {
  id: string;
  title: string;
  sessionType: string;
  presentationType: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
  submissionDate: string;
  manuscriptUploaded: boolean;
}

interface PaymentInfo {
  status: 'not_paid' | 'payment_submitted' | 'payment_verified' | 'payment_rejected';
  amount: number;
  dueDate: string;
  rejectionReason?: string;
}

// Mock data - would come from API
const mockSubmissions: Submission[] = [
  {
    id: '1',
    title: 'Advanced Machine Learning Techniques in Computational Chemistry',
    sessionType: 'CHE',
    presentationType: 'oral',
    status: 'under_review',
    submissionDate: '2024-01-15',
    manuscriptUploaded: true,
  },
  {
    id: '2',
    title: 'Quantum Computing Applications in Drug Discovery',
    sessionType: 'BIO',
    presentationType: 'poster',
    status: 'accepted',
    submissionDate: '2024-01-10',
    manuscriptUploaded: false,
  },
];

const mockPaymentInfo: PaymentInfo = {
  status: 'payment_submitted',
  amount: 150,
  dueDate: '2024-02-15',
};

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [submissions] = useState<Submission[]>(mockSubmissions);
  const [paymentInfo] = useState<PaymentInfo>(mockPaymentInfo);

  if (!user) {
    return (
      <Alert severity="warning">
        Please log in to view your dashboard.
      </Alert>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'payment_verified':
        return 'success';
      case 'rejected':
      case 'payment_rejected':
        return 'error';
      case 'under_review':
      case 'payment_submitted':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'payment_verified':
        return <CheckCircle color="success" />;
      case 'rejected':
      case 'payment_rejected':
        return <Error color="error" />;
      case 'under_review':
      case 'payment_submitted':
        return <Warning color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  const getProgressValue = () => {
    let progress = 0;
    
    // Registration completed
    progress += 25;
    
    // Payment status
    if (paymentInfo.status === 'payment_verified') {
      progress += 25;
    } else if (paymentInfo.status === 'payment_submitted') {
      progress += 15;
    }
    
    // Submissions
    if (submissions.length > 0) {
      progress += 25;
    }
    
    // Manuscripts uploaded
    const manuscriptsUploaded = submissions.filter(s => s.manuscriptUploaded).length;
    if (manuscriptsUploaded === submissions.length && submissions.length > 0) {
      progress += 25;
    } else if (manuscriptsUploaded > 0) {
      progress += 15;
    }
    
    return Math.min(progress, 100);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user.firstName}!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Track your conference registration, submissions, and payment status.
      </Typography>

      {/* Progress Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Registration Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={getProgressValue()} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {getProgressValue()}%
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Complete all steps to finalize your conference registration
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Registration Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Registration Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="body1">Registration Complete</Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Participant Type"
                    secondary={user.participantType.replace('_', ' ').toUpperCase()}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Selected Sessions"
                    secondary={user.selectedSessions.join(', ')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Registration Date"
                    secondary={new Date(user.registrationDate).toLocaleDateString()}
                  />
                </ListItem>
              </List>
              <Button variant="outlined" startIcon={<Edit />} size="small">
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getStatusIcon(paymentInfo.status)}
                <Box sx={{ ml: 1 }}>
                  <Chip
                    label={paymentInfo.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(paymentInfo.status)}
                    size="small"
                  />
                </Box>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Registration Fee"
                    secondary={`$${paymentInfo.amount}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Due Date"
                    secondary={new Date(paymentInfo.dueDate).toLocaleDateString()}
                  />
                </ListItem>
                {paymentInfo.rejectionReason && (
                  <ListItem>
                    <ListItemText
                      primary="Rejection Reason"
                      secondary={paymentInfo.rejectionReason}
                    />
                  </ListItem>
                )}
              </List>
              {paymentInfo.status !== 'payment_verified' && (
                <Button variant="contained" startIcon={<Payment />} size="small">
                  {paymentInfo.status === 'not_paid' ? 'Make Payment' : 'Update Payment'}
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Submissions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  My Submissions ({submissions.length})
                </Typography>
                <Button variant="contained" startIcon={<Assignment />}>
                  New Submission
                </Button>
              </Box>

              {submissions.length === 0 ? (
                <Alert severity="info">
                  You haven't submitted any abstracts yet. Click "New Submission" to get started.
                </Alert>
              ) : (
                <List>
                  {submissions.map((submission, index) => (
                    <React.Fragment key={submission.id}>
                      <ListItem
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          py: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', mb: 1 }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" gutterBottom>
                              {submission.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                              <Chip label={submission.sessionType} size="small" color="primary" />
                              <Chip label={submission.presentationType} size="small" color="secondary" />
                              <Chip
                                label={submission.status.replace('_', ' ').toUpperCase()}
                                size="small"
                                color={getStatusColor(submission.status)}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Submitted: {new Date(submission.submissionDate).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton size="small">
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Submission">
                              <IconButton size="small">
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            {submission.manuscriptUploaded ? (
                              <Tooltip title="Download Manuscript">
                                <IconButton size="small" color="success">
                                  <Download />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Upload Manuscript">
                                <IconButton size="small" color="warning">
                                  <Upload />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                        
                        {submission.status === 'accepted' && !submission.manuscriptUploaded && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            Your abstract has been accepted! Please upload your full manuscript.
                          </Alert>
                        )}
                        
                        {submission.status === 'rejected' && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            Unfortunately, your submission was not accepted. You can view reviewer feedback in the details.
                          </Alert>
                        )}
                      </ListItem>
                      {index < submissions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Assignment />}
                    sx={{ py: 2 }}
                  >
                    Submit Abstract
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Upload />}
                    sx={{ py: 2 }}
                  >
                    Upload Manuscript
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Payment />}
                    sx={{ py: 2 }}
                  >
                    Payment Info
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Download />}
                    sx={{ py: 2 }}
                  >
                    Conference Materials
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};