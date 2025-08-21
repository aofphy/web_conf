import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Button,
} from '@mui/material';
import {
  People,
  Assignment,
  Payment,
  CheckCircle,
  Warning,
  Error,
  TrendingUp,
  Schedule,
  Notifications,
} from '@mui/icons-material';

interface DashboardStats {
  totalUsers: number;
  totalSubmissions: number;
  pendingReviews: number;
  pendingPayments: number;
  acceptedSubmissions: number;
  rejectedSubmissions: number;
  verifiedPayments: number;
  registrationsByType: Record<string, number>;
  submissionsBySession: Record<string, number>;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'registration' | 'submission' | 'payment' | 'review';
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

// Mock data - would come from API
const mockStats: DashboardStats = {
  totalUsers: 245,
  totalSubmissions: 89,
  pendingReviews: 23,
  pendingPayments: 15,
  acceptedSubmissions: 45,
  rejectedSubmissions: 12,
  verifiedPayments: 180,
  registrationsByType: {
    'oral_presenter': 35,
    'poster_presenter': 42,
    'regular_participant': 120,
    'reviewer': 25,
    'organizer': 8,
  },
  submissionsBySession: {
    'CHE': 18,
    'CSE': 22,
    'BIO': 15,
    'MST': 20,
    'PFD': 14,
  },
  recentActivity: [
    {
      id: '1',
      type: 'submission',
      description: 'New abstract submitted by Dr. Smith',
      timestamp: '2024-01-20T10:30:00Z',
      status: 'info',
    },
    {
      id: '2',
      type: 'payment',
      description: 'Payment verified for John Doe',
      timestamp: '2024-01-20T09:15:00Z',
      status: 'success',
    },
    {
      id: '3',
      type: 'review',
      description: 'Review completed for submission #45',
      timestamp: '2024-01-20T08:45:00Z',
      status: 'success',
    },
    {
      id: '4',
      type: 'registration',
      description: 'New user registration: Jane Wilson',
      timestamp: '2024-01-19T16:20:00Z',
      status: 'info',
    },
  ],
};

export const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Fetch real stats from API
    setLoading(false);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return <People color="primary" />;
      case 'submission':
        return <Assignment color="info" />;
      case 'payment':
        return <Payment color="success" />;
      case 'review':
        return <CheckCircle color="success" />;
      default:
        return <Notifications color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Monitor conference registration, submissions, and overall system health.
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Total Users
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalUsers}
                  </Typography>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Submissions
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalSubmissions}
                  </Typography>
                </Box>
                <Assignment color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Pending Reviews
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.pendingReviews}
                  </Typography>
                </Box>
                <Warning color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Pending Payments
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {stats.pendingPayments}
                  </Typography>
                </Box>
                <Error color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts and Notifications */}
      {(stats.pendingReviews > 20 || stats.pendingPayments > 10) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Action Required</Typography>
          {stats.pendingReviews > 20 && (
            <Typography variant="body2">
              • {stats.pendingReviews} submissions are pending review
            </Typography>
          )}
          {stats.pendingPayments > 10 && (
            <Typography variant="body2">
              • {stats.pendingPayments} payments need verification
            </Typography>
          )}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Submission Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Submission Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Accepted</Typography>
                  <Typography variant="body2">{stats.acceptedSubmissions}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(stats.acceptedSubmissions / stats.totalSubmissions) * 100}
                  color="success"
                  sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Under Review</Typography>
                  <Typography variant="body2">{stats.pendingReviews}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(stats.pendingReviews / stats.totalSubmissions) * 100}
                  color="warning"
                  sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Rejected</Typography>
                  <Typography variant="body2">{stats.rejectedSubmissions}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(stats.rejectedSubmissions / stats.totalSubmissions) * 100}
                  color="error"
                />
              </Box>
              <Button variant="outlined" size="small" startIcon={<Assignment />}>
                Manage Submissions
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Registration Types */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Registration Types
              </Typography>
              <List dense>
                {Object.entries(stats.registrationsByType).map(([type, count]) => (
                  <ListItem key={type} sx={{ px: 0 }}>
                    <ListItemText
                      primary={type.replace('_', ' ').toUpperCase()}
                      secondary={`${count} registrations`}
                    />
                    <Chip label={count} size="small" color="primary" />
                  </ListItem>
                ))}
              </List>
              <Button variant="outlined" size="small" startIcon={<People />}>
                Manage Users
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Session Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Submissions by Session
              </Typography>
              <List dense>
                {Object.entries(stats.submissionsBySession).map(([session, count]) => (
                  <ListItem key={session} sx={{ px: 0 }}>
                    <ListItemText
                      primary={session}
                      secondary={`${count} submissions`}
                    />
                    <Box sx={{ width: 100, mr: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(count / Math.max(...Object.values(stats.submissionsBySession))) * 100}
                        color="primary"
                      />
                    </Box>
                    <Typography variant="body2">{count}</Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <List>
                {stats.recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        {getActivityIcon(activity.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.description}
                        secondary={new Date(activity.timestamp).toLocaleString()}
                      />
                      <Chip
                        label={activity.type}
                        size="small"
                        color={getStatusColor(activity.status)}
                        variant="outlined"
                      />
                    </ListItem>
                    {index < stats.recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              <Button variant="outlined" size="small" startIcon={<TrendingUp />}>
                View All Activity
              </Button>
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
                    Review Submissions
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Payment />}
                    sx={{ py: 2 }}
                  >
                    Verify Payments
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<People />}
                    sx={{ py: 2 }}
                  >
                    Manage Users
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Schedule />}
                    sx={{ py: 2 }}
                  >
                    Generate Reports
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