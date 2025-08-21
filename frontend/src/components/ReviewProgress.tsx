import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Assessment as ProgressIcon,
  People as ReviewersIcon,
  Assignment as AssignmentsIcon,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

interface ReviewProgress {
  totalAssignments: number;
  completedReviews: number;
  pendingReviews: number;
  completionPercentage: number;
  submissionsUnderReview: number;
  activeReviewers: number;
  submissionsByStatus: Record<string, number>;
  reviewerWorkload: Array<{
    reviewerName: string;
    totalAssignments: number;
    completedReviews: number;
    pendingReviews: number;
    completionRate: number;
  }>;
}

interface SubmissionReview {
  reviews: Array<{
    id: string;
    reviewerId: string;
    score?: number;
    comments?: string;
    recommendation?: string;
    isCompleted: boolean;
    reviewDate: string;
  }>;
  stats: {
    totalReviews: number;
    completedReviews: number;
    averageScore: number | null;
  };
}

const ReviewProgress: React.FC = () => {
  const [progress, setProgress] = useState<ReviewProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [submissionReviews, setSubmissionReviews] = useState<SubmissionReview | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews/progress/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to fetch review progress');
      }
    } catch (err) {
      setError('Failed to fetch review progress');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmissionReviews = async (submissionId: string) => {
    setSelectedSubmission(submissionId);
    setReviewsLoading(true);
    setReviewDialogOpen(true);

    try {
      const response = await fetch(`/api/reviews/submission/${submissionId}/reviews`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissionReviews(data.data);
      } else {
        setError('Failed to fetch submission reviews');
        setReviewDialogOpen(false);
      }
    } catch (err) {
      setError('Failed to fetch submission reviews');
      setReviewDialogOpen(false);
    } finally {
      setReviewsLoading(false);
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'accept': return '#4caf50';
      case 'minor_revision': return '#ff9800';
      case 'major_revision': return '#f44336';
      case 'reject': return '#757575';
      default: return '#757575';
    }
  };

  const formatRecommendation = (recommendation: string) => {
    return recommendation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!progress) {
    return (
      <Box p={3}>
        <Alert severity="info">
          No review progress data available.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Review Progress Monitoring
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AssignmentsIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {progress.totalAssignments}
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
                <CompletedIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {progress.completedReviews}
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
                <PendingIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {progress.pendingReviews}
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
                <ReviewersIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {progress.activeReviewers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Reviewers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overall Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <ProgressIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Overall Review Progress
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2">
                Completion Rate
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {progress.completionPercentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress.completionPercentage}
              color={getCompletionColor(progress.completionPercentage)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Submissions Under Review: {progress.submissionsUnderReview}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box display="flex" gap={1}>
                {Object.entries(progress.submissionsByStatus).map(([status, count]) => (
                  <Chip
                    key={status}
                    label={`${status.replace('_', ' ')}: ${count}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Reviewer Workload */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Reviewer Workload
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reviewer</TableCell>
                  <TableCell align="center">Total Assignments</TableCell>
                  <TableCell align="center">Completed</TableCell>
                  <TableCell align="center">Pending</TableCell>
                  <TableCell align="center">Completion Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {progress.reviewerWorkload.map((reviewer, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {reviewer.reviewerName}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {reviewer.totalAssignments}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={reviewer.completedReviews}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={reviewer.pendingReviews}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center">
                        <LinearProgress
                          variant="determinate"
                          value={reviewer.completionRate}
                          color={getCompletionColor(reviewer.completionRate)}
                          sx={{ width: 60, mr: 1, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption">
                          {reviewer.completionRate}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {progress.reviewerWorkload.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No reviewer assignments found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Submission Reviews Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Submission Reviews
        </DialogTitle>
        <DialogContent>
          {reviewsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : submissionReviews ? (
            <Box>
              <Box mb={2}>
                <Typography variant="h6" gutterBottom>
                  Review Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      Total Reviews: {submissionReviews.stats.totalReviews}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      Completed: {submissionReviews.stats.completedReviews}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      Average Score: {submissionReviews.stats.averageScore?.toFixed(1) || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Individual Reviews
              </Typography>
              
              <List>
                {submissionReviews.reviews.map((review, index) => (
                  <ListItem key={review.id} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="bold">
                            Review {index + 1}
                          </Typography>
                          {review.isCompleted ? (
                            <Chip label="Completed" size="small" color="success" />
                          ) : (
                            <Chip label="Pending" size="small" color="warning" />
                          )}
                        </Box>
                      }
                      secondary={
                        review.isCompleted ? (
                          <Box mt={1}>
                            <Typography variant="body2">
                              Score: {review.score}/10
                            </Typography>
                            {review.recommendation && (
                              <Chip
                                label={formatRecommendation(review.recommendation)}
                                size="small"
                                sx={{
                                  backgroundColor: getRecommendationColor(review.recommendation),
                                  color: 'white',
                                  mt: 0.5
                                }}
                              />
                            )}
                            {review.comments && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                Comments: {review.comments.substring(0, 100)}
                                {review.comments.length > 100 ? '...' : ''}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Review not yet completed
                          </Typography>
                        )
                      }
                    />
                  </ListItem>
                ))}
                {submissionReviews.reviews.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No reviews found"
                      secondary="This submission has not been assigned to any reviewers yet"
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewProgress;