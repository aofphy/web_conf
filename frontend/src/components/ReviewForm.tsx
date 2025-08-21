import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SubmitIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

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

interface Review {
  id: string;
  submissionId: string;
  reviewerId: string;
  score?: number;
  comments?: string;
  recommendation?: 'accept' | 'reject' | 'minor_revision' | 'major_revision';
  isCompleted: boolean;
}

const ReviewForm: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState<SubmissionDetails | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [score, setScore] = useState<number>(5);
  const [comments, setComments] = useState<string>('');
  const [recommendation, setRecommendation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submissionLoading, setSubmissionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (submissionId) {
      fetchSubmissionAndReview();
    }
  }, [submissionId]);

  const fetchSubmissionAndReview = async () => {
    setSubmissionLoading(true);
    setError(null);

    try {
      // Fetch submission details
      const submissionResponse = await fetch(`/api/submissions/${submissionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!submissionResponse.ok) {
        throw new Error('Failed to fetch submission details');
      }

      const submissionData = await submissionResponse.json();
      setSubmission(submissionData.data);

      // Find the review for this submission and current user
      const userId = getCurrentUserId();
      if (userId) {
        const assignmentsResponse = await fetch(`/api/reviews/reviewer/${userId}/assignments`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          const assignment = assignmentsData.data.find((a: any) => a.submissionId === submissionId);
          
          if (assignment) {
            // Fetch the review details
            const reviewResponse = await fetch(`/api/reviews/${assignment.reviewId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            if (reviewResponse.ok) {
              const reviewData = await reviewResponse.json();
              const reviewDetails = reviewData.data;
              setReview(reviewDetails);
              
              // Pre-fill form if review exists
              if (reviewDetails.score) setScore(reviewDetails.score);
              if (reviewDetails.comments) setComments(reviewDetails.comments);
              if (reviewDetails.recommendation) setRecommendation(reviewDetails.recommendation);
            }
          }
        }
      }
    } catch (err) {
      setError('Failed to load submission and review data');
    } finally {
      setSubmissionLoading(false);
    }
  };

  const getCurrentUserId = () => {
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

  const handleSubmitReview = async () => {
    if (!review) {
      setError('Review not found');
      return;
    }

    if (!comments.trim() || !recommendation) {
      setError('Please provide comments and recommendation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          score,
          comments: comments.trim(),
          recommendation
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Review submitted successfully');
        setConfirmDialogOpen(false);
        
        // Navigate back to reviewer dashboard after a short delay
        setTimeout(() => {
          navigate('/reviews');
        }, 2000);
      } else {
        setError(data.error?.message || 'Failed to submit review');
      }
    } catch (err) {
      setError('Failed to submit review');
    } finally {
      setLoading(false);
    }
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

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#4caf50'; // Green
    if (score >= 6) return '#ff9800'; // Orange
    if (score >= 4) return '#f44336'; // Red
    return '#757575'; // Grey
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 5) return 'Average';
    if (score >= 3) return 'Below Average';
    return 'Poor';
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'accept': return '#4caf50';
      case 'minor_revision': return '#ff9800';
      case 'major_revision': return '#f44336';
      case 'reject': return '#757575';
      default: return '#757575';
    }
  };

  if (submissionLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!submission || !review) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Submission or review not found. You may not have permission to review this submission.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Review Submission
      </Typography>

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

      <Grid container spacing={3}>
        {/* Submission Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ViewIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Submission Details
              </Typography>

              <Typography variant="h6" gutterBottom>
                {submission.title}
              </Typography>

              <Box display="flex" gap={1} mb={2}>
                <Chip
                  label={submission.sessionType}
                  sx={{ 
                    backgroundColor: getSessionTypeColor(submission.sessionType),
                    color: 'white'
                  }}
                />
                <Chip
                  label={submission.presentationType}
                  variant="outlined"
                />
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Authors:
              </Typography>
              <List dense>
                {submission.authors.map((author, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={author.name}
                      secondary={`${author.affiliation}${author.isCorresponding ? ' (Corresponding)' : ''}`}
                    />
                  </ListItem>
                ))}
              </List>

              <Typography variant="subtitle2" gutterBottom>
                Keywords:
              </Typography>
              <Box display="flex" gap={0.5} mb={2} flexWrap="wrap">
                {submission.keywords.map((keyword, index) => (
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
                {submission.abstractHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: submission.abstractHtml }} />
                ) : (
                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                    {submission.abstract}
                  </Typography>
                )}
              </Box>

              {submission.manuscriptPath && (
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    href={`/api/submissions/${submission.id}/manuscript`}
                    target="_blank"
                  >
                    Download Manuscript
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Review Form */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Review Form
              </Typography>

              {review.isCompleted && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  This review has already been submitted. You can view but not modify it.
                </Alert>
              )}

              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Score (1-10): {score} - {getScoreLabel(score)}
                </Typography>
                <Slider
                  value={score}
                  onChange={(_, newValue) => setScore(newValue as number)}
                  min={1}
                  max={10}
                  step={1}
                  marks
                  disabled={review.isCompleted}
                  sx={{
                    color: getScoreColor(score),
                    '& .MuiSlider-thumb': {
                      backgroundColor: getScoreColor(score),
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: getScoreColor(score),
                    }
                  }}
                />
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption">Poor</Typography>
                  <Typography variant="caption">Excellent</Typography>
                </Box>
              </Box>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Recommendation</InputLabel>
                <Select
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  label="Recommendation"
                  disabled={review.isCompleted}
                >
                  <MenuItem value="accept">
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: getRecommendationColor('accept'),
                          mr: 1
                        }}
                      />
                      Accept
                    </Box>
                  </MenuItem>
                  <MenuItem value="minor_revision">
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: getRecommendationColor('minor_revision'),
                          mr: 1
                        }}
                      />
                      Minor Revision
                    </Box>
                  </MenuItem>
                  <MenuItem value="major_revision">
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: getRecommendationColor('major_revision'),
                          mr: 1
                        }}
                      />
                      Major Revision
                    </Box>
                  </MenuItem>
                  <MenuItem value="reject">
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: getRecommendationColor('reject'),
                          mr: 1
                        }}
                      />
                      Reject
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={8}
                label="Comments and Feedback"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Please provide detailed feedback on the submission, including strengths, weaknesses, and suggestions for improvement..."
                disabled={review.isCompleted}
                sx={{ mb: 3 }}
              />

              <Divider sx={{ mb: 2 }} />

              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/reviews')}
                  fullWidth
                >
                  Back to Dashboard
                </Button>
                
                {!review.isCompleted && (
                  <Button
                    variant="contained"
                    startIcon={<SubmitIcon />}
                    onClick={() => setConfirmDialogOpen(true)}
                    disabled={loading || !comments.trim() || !recommendation}
                    fullWidth
                  >
                    Submit Review
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Review Submission
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to submit this review? Once submitted, you cannot modify it.
          </Typography>
          
          <Box mt={2}>
            <Typography variant="subtitle2">Review Summary:</Typography>
            <Typography variant="body2">Score: {score}/10 ({getScoreLabel(score)})</Typography>
            <Typography variant="body2">Recommendation: {recommendation?.replace('_', ' ')}</Typography>
            <Typography variant="body2">Comments: {comments.length} characters</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitReview}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewForm;