import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Assignment,
  RateReview,
  Warning,
  Send,
  Refresh,
  Timeline
} from '@mui/icons-material';
import {
  adminMonitoringApi,
  SubmissionStatistics,
  ReviewProgress,
  MonitoringDashboard
} from '../services/adminMonitoringApi';

const AdminSubmissionMonitoring: React.FC = () => {
  const [submissionStats, setSubmissionStats] = useState<SubmissionStatistics | null>(null);
  const [reviewProgress, setReviewProgress] = useState<ReviewProgress | null>(null);
  const [dashboard, setDashboard] = useState<MonitoringDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reminder dialog state
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, progressData, dashboardData] = await Promise.all([
        adminMonitoringApi.getSubmissionStatistics(),
        adminMonitoringApi.getReviewProgress(),
        adminMonitoringApi.getMonitoringDashboard()
      ]);

      setSubmissionStats(statsData);
      setReviewProgress(progressData);
      setDashboard(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendReminders = async () => {
    if (selectedReviewers.length === 0) {
      setError('Please select at least one reviewer');
      return;
    }

    try {
      setSendingReminders(true);
      setError(null);

      const result = await adminMonitoringApi.sendReviewReminders({
        reviewerIds: selectedReviewers,
        message: reminderMessage
      });

      setSuccess(`Reminders sent to ${result.reviewersNotified} reviewers for ${result.totalPendingReviews} pending reviews`);
      setReminderDialogOpen(false);
      setSelectedReviewers([]);
      setReminderMessage('');
      loadData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'under_review': return 'warning';
      case 'submitted': return 'info';
      default: return 'default';
    }
  };

  const formatSessionType = (sessionType: string) => {
    const sessionNames: Record<string, string> = {
      'CHE': 'Computational Chemistry',
      'CSE': 'Computer Science/Engineering',
      'BIO': 'Biology/Bioinformatics',
      'MST': 'Mathematics/Statistics',
      'PFD': 'Physics/Fluid Dynamics'
    };
    return sessionNames[sessionType] || sessionType;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Submissions & Reviews Monitoring
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assignment sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Submissions
                  </Typography>
                  <Typography variant="h4">
                    {submissionStats?.totalSubmissions || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <RateReview sx={{ mr: 2, color: 'success.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Completed Reviews
                  </Typography>
                  <Typography variant="h4">
                    {reviewProgress?.reviewStats.completedReviews || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {reviewProgress?.reviewStats.completionRate || 0}% completion rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning sx={{ mr: 2, color: 'warning.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Reviews
                  </Typography>
                  <Typography variant="h4">
                    {reviewProgress?.reviewStats.pendingReviews || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Timeline sx={{ mr: 2, color: 'error.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Overdue Reviews
                  </Typography>
                  <Typography variant="h4">
                    {dashboard?.overdueReviews.length || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Submission Overview */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Submissions by Session & Status
            </Typography>
            {dashboard?.submissionOverview && Object.entries(dashboard.submissionOverview).map(([session, statuses]) => (
              <Box key={session} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {formatSessionType(session)}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {Object.entries(statuses).map(([status, count]) => (
                    <Chip
                      key={status}
                      label={`${status}: ${count}`}
                      color={getStatusColor(status)}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Reviewer Workload */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Reviewer Workload
            </Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Reviewer</TableCell>
                    <TableCell align="right">Assigned</TableCell>
                    <TableCell align="right">Completed</TableCell>
                    <TableCell align="right">Pending</TableCell>
                    <TableCell align="right">Progress</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviewProgress?.reviewerWorkload.map((reviewer, index) => {
                    const completionRate = reviewer.total_assigned > 0 
                      ? (reviewer.completed / reviewer.total_assigned) * 100 
                      : 0;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">
                            {reviewer.first_name} {reviewer.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {reviewer.email}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{reviewer.total_assigned}</TableCell>
                        <TableCell align="right">{reviewer.completed}</TableCell>
                        <TableCell align="right">{reviewer.pending}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ width: 60 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={completionRate}
                              color={completionRate >= 80 ? 'success' : completionRate >= 50 ? 'warning' : 'error'}
                            />
                            <Typography variant="caption">
                              {completionRate.toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Overdue Reviews */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Overdue Reviews
              </Typography>
              <Button
                size="small"
                startIcon={<Send />}
                onClick={() => {
                  const overdueReviewerIds = dashboard?.overdueReviews.map(review => 
                    reviewProgress?.reviewerWorkload.find(r => 
                      `${r.first_name} ${r.last_name}` === review.reviewer_name
                    )
                  ).filter(Boolean).map(r => r?.email).filter(Boolean) as string[];
                  
                  setSelectedReviewers(overdueReviewerIds);
                  setReminderDialogOpen(true);
                }}
                disabled={!dashboard?.overdueReviews.length}
              >
                Send Reminders
              </Button>
            </Box>
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {dashboard?.overdueReviews.map((review, index) => (
                <React.Fragment key={review.review_id}>
                  <ListItem>
                    <ListItemText
                      primary={review.submission_title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Reviewer: {review.reviewer_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Session: {formatSessionType(review.session_type)}
                          </Typography>
                          <Typography variant="body2" color="error">
                            {review.days_overdue} days overdue
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < (dashboard?.overdueReviews.length || 0) - 1 && <Divider />}
                </React.Fragment>
              ))}
              {(!dashboard?.overdueReviews.length) && (
                <ListItem>
                  <ListItemText primary="No overdue reviews" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {dashboard?.recentActivity.map((activity, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={activity.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {activity.type === 'submission' ? 'Submitted' : 'Reviewed'} by {activity.user_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(activity.timestamp).toLocaleString()}
                          </Typography>
                          <Chip 
                            label={activity.status} 
                            size="small" 
                            color={getStatusColor(activity.status)}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < (dashboard?.recentActivity.length || 0) - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Send Reminders Dialog */}
      <Dialog open={reminderDialogOpen} onClose={() => setReminderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Review Reminders</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Send reminder emails to reviewers with pending reviews.
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Custom Message (Optional)"
            placeholder="Please complete your pending reviews by the deadline..."
            value={reminderMessage}
            onChange={(e) => setReminderMessage(e.target.value)}
            sx={{ mt: 2 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {selectedReviewers.length} reviewer(s) selected
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReminderDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSendReminders} 
            variant="contained"
            disabled={sendingReminders || selectedReviewers.length === 0}
          >
            {sendingReminders ? <CircularProgress size={20} /> : 'Send Reminders'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminSubmissionMonitoring;