import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Visibility as ViewIcon,
  RateReview as ReviewIcon,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';

interface ReviewerAssignment {
  reviewId: string;
  submissionId: string;
  submissionTitle: string;
  sessionType: string;
  presentationType: string;
  submissionStatus: string;
  authorName: string;
  assignedDate: string;
  isCompleted: boolean;
}

interface SubmissionDetails {
  id: string;
  title: string;
  abstract: string;
  abstractHtml?: string;
  keywords: string[];
  sessionType: string;
  presentationType: string;
  authors: Array<{
    name: string;
    affiliation: string;
    email: string;
    isCorresponding: boolean;
  }>;
  manuscriptPath?: string;
}

const ReviewerDashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<ReviewerAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetails | null>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [submissionLoading, setSubmissionLoading] = useState(false);

  // Get current user ID from token or context
  const getCurrentUserId = () => {
    // This should be implemented based on your auth system
    // For now, we'll assume it's stored in localStorage or context
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/reviewer/${userId}/assignments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to fetch assignments');
      }
    } catch (err) {
      setError('Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = async (submissionId: string) => {
    setSubmissionLoading(true);
    setSubmissionDialogOpen(true);

    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedSubmission(data.data);
      } else {
        setError('Failed to fetch submission details');
        setSubmissionDialogOpen(false);
      }
    } catch (err) {
      setError('Failed to fetch submission details');
      setSubmissionDialogOpen(false);
    } finally {
      setSubmissionLoading(false);
    }
  };

  const handleStartReview = (submissionId: string) => {
    // Navigate to review form
    window.location.href = `/review-submission/${submissionId}`;
  };

  const getSessionTypeColor = (sessionType: string) => {
    const colors: Record<string, string> = {
      'CHE': '#ff9800',
      'CSE': '#2196f3',
      'BIO': '#4caf50',
      'MST': '#9c27b0',
      'PFD': '#f44336'
    };
    return colors[sessionType] || '#757575';
  };

  const getStatusIcon = (isCompleted: boolean) => {
    return isCompleted ? (
      <CompletedIcon color="success" />
    ) : (
      <PendingIcon color="warning" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const completedAssignments = assignments.filter(a => a.isCompleted);
  const pendingAssignments = assignments.filter(a => !a.isCompleted);

  if (loading && assignments.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reviewer Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AssignmentIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {assignments.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Assignments
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
                <PendingIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {pendingAssignments.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Reviews
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
                <CompletedIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {completedAssignments.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed Reviews
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
                <ReviewIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {assignments.length > 0 ? Math.round((completedAssignments.length / assignments.length) * 100) : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completion Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Reviews */}
      {pendingAssignments.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="warning.main">
              <PendingIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Pending Reviews ({pendingAssignments.length})
            </Typography>
            <List>
              {pendingAssignments.map((assignment) => (
                <ListItem key={assignment.reviewId} divider>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {assignment.submissionTitle}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Author: {assignment.authorName}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box display="flex" gap={1} mt={1}>
                        <Chip
                          label={assignment.sessionType}
                          size="small"
                          sx={{ 
                            backgroundColor: getSessionTypeColor(assignment.sessionType),
                            color: 'white'
                          }}
                        />
                        <Chip
                          label={assignment.presentationType}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" sx={{ ml: 1, alignSelf: 'center' }}>
                          Assigned: {formatDate(assignment.assignedDate)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" gap={1}>
                      <Tooltip title="View Submission">
                        <IconButton
                          onClick={() => handleViewSubmission(assignment.submissionId)}
                          color="primary"
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ReviewIcon />}
                        onClick={() => handleStartReview(assignment.submissionId)}
                      >
                        Start Review
                      </Button>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Completed Reviews */}
      {completedAssignments.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="success.main">
              <CompletedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Completed Reviews ({completedAssignments.length})
            </Typography>
            <List>
              {completedAssignments.map((assignment) => (
                <ListItem key={assignment.reviewId} divider>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {assignment.submissionTitle}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Author: {assignment.authorName}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box display="flex" gap={1} mt={1}>
                        <Chip
                          label={assignment.sessionType}
                          size="small"
                          sx={{ 
                            backgroundColor: getSessionTypeColor(assignment.sessionType),
                            color: 'white'
                          }}
                        />
                        <Chip
                          label={assignment.presentationType}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label="Completed"
                          size="small"
                          color="success"
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="View Submission">
                      <IconButton
                        onClick={() => handleViewSubmission(assignment.submissionId)}
                        color="primary"
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {assignments.length === 0 && !loading && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Review Assignments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You haven't been assigned any submissions to review yet.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Submission Details Dialog */}
      <Dialog
        open={submissionDialogOpen}
        onClose={() => setSubmissionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Submission Details
        </DialogTitle>
        <DialogContent>
          {submissionLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : selectedSubmission ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedSubmission.title}
              </Typography>
              
              <Box display="flex" gap={1} mb={2}>
                <Chip
                  label={selectedSubmission.sessionType}
                  sx={{ 
                    backgroundColor: getSessionTypeColor(selectedSubmission.sessionType),
                    color: 'white'
                  }}
                />
                <Chip
                  label={selectedSubmission.presentationType}
                  variant="outlined"
                />
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Authors:
              </Typography>
              <List dense>
                {selectedSubmission.authors.map((author, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={author.name}
                      secondary={`${author.affiliation}${author.isCorresponding ? ' (Corresponding)' : ''}`}
                    />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Keywords:
              </Typography>
              <Box display="flex" gap={0.5} mb={2} flexWrap="wrap">
                {selectedSubmission.keywords.map((keyword, index) => (
                  <Chip
                    key={index}
                    label={keyword}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Abstract:
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  maxHeight: 300,
                  overflow: 'auto'
                }}
              >
                {selectedSubmission.abstractHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedSubmission.abstractHtml }} />
                ) : (
                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedSubmission.abstract}
                  </Typography>
                )}
              </Box>

              {selectedSubmission.manuscriptPath && (
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    href={`/api/submissions/${selectedSubmission.id}/manuscript`}
                    target="_blank"
                  >
                    Download Manuscript
                  </Button>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmissionDialogOpen(false)}>
            Close
          </Button>
          {selectedSubmission && (
            <Button
              variant="contained"
              onClick={() => {
                setSubmissionDialogOpen(false);
                handleStartReview(selectedSubmission.id);
              }}
            >
              Start Review
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewerDashboard;