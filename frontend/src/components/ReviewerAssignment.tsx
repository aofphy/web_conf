import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Delete as DeleteIcon,
  Lightbulb as SuggestionIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface Reviewer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string;
  expertise: string[];
}

interface Submission {
  id: string;
  title: string;
  sessionType: string;
  presentationType: string;
  keywords: string[];
  authors: Array<{
    name: string;
    affiliation: string;
  }>;
}

interface Assignment {
  reviewId: string;
  submissionId: string;
  reviewerId: string;
  submissionTitle: string;
  sessionType: string;
  reviewerName: string;
  reviewerExpertise: string[];
  authorName: string;
  assignedDate: string;
  isCompleted: boolean;
}

interface AssignmentSuggestion {
  reviewerId: string;
  name: string;
  expertise: string[];
  affiliation: string;
  matchScore: number;
  currentAssignments: number;
  matchReason: string;
}

const ReviewerAssignment: React.FC = () => {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<string>('');
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AssignmentSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchReviewers(),
        fetchSubmissions(),
        fetchAssignments()
      ]);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewers = async () => {
    const response = await fetch('/api/reviews/reviewers', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setReviewers(data.data);
    }
  };

  const fetchSubmissions = async () => {
    const response = await fetch('/api/reviews/submissions/available', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setSubmissions(data.data);
    }
  };

  const fetchAssignments = async () => {
    const response = await fetch('/api/reviews/assignments', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setAssignments(data.data);
    }
  };

  const handleAssignReviewer = async () => {
    if (!selectedSubmission || !selectedReviewer) {
      setError('Please select both a submission and a reviewer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          submissionId: selectedSubmission,
          reviewerId: selectedReviewer
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Reviewer assigned successfully');
        setSelectedSubmission('');
        setSelectedReviewer('');
        await fetchAssignments();
        await fetchSubmissions(); // Refresh to update available submissions
      } else {
        setError(data.error?.message || 'Failed to assign reviewer');
      }
    } catch (err) {
      setError('Failed to assign reviewer');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (reviewId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/assignments/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Assignment removed successfully');
        await fetchAssignments();
        await fetchSubmissions(); // Refresh to update available submissions
      } else {
        setError(data.error?.message || 'Failed to remove assignment');
      }
    } catch (err) {
      setError('Failed to remove assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleGetSuggestions = async (submissionId: string) => {
    setSuggestionsLoading(true);
    setSuggestionsOpen(true);

    try {
      const response = await fetch(`/api/reviews/suggestions/${submissionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data);
      } else {
        setError('Failed to fetch suggestions');
        setSuggestionsOpen(false);
      }
    } catch (err) {
      setError('Failed to fetch suggestions');
      setSuggestionsOpen(false);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleAssignFromSuggestion = (reviewerId: string) => {
    setSelectedReviewer(reviewerId);
    setSuggestionsOpen(false);
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

  const getMatchScoreColor = (score: number) => {
    if (score >= 3) return '#4caf50';
    if (score >= 2) return '#ff9800';
    return '#757575';
  };

  if (loading && reviewers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reviewer Assignment System
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
        {/* Assignment Form */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Assign Reviewer
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Submission</InputLabel>
                <Select
                  value={selectedSubmission}
                  onChange={(e) => setSelectedSubmission(e.target.value)}
                  label="Select Submission"
                >
                  {submissions.map((submission) => (
                    <MenuItem key={submission.id} value={submission.id}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {submission.title}
                        </Typography>
                        <Box display="flex" gap={1} mt={0.5}>
                          <Chip
                            label={submission.sessionType}
                            size="small"
                            sx={{ 
                              backgroundColor: getSessionTypeColor(submission.sessionType),
                              color: 'white'
                            }}
                          />
                          <Chip
                            label={submission.presentationType}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedSubmission && (
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SuggestionIcon />}
                    onClick={() => handleGetSuggestions(selectedSubmission)}
                  >
                    Get Suggestions
                  </Button>
                </Box>
              )}

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Reviewer</InputLabel>
                <Select
                  value={selectedReviewer}
                  onChange={(e) => setSelectedReviewer(e.target.value)}
                  label="Select Reviewer"
                >
                  {reviewers.map((reviewer) => (
                    <MenuItem key={reviewer.id} value={reviewer.id}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {reviewer.firstName} {reviewer.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {reviewer.affiliation}
                        </Typography>
                        {reviewer.expertise.length > 0 && (
                          <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                            {reviewer.expertise.slice(0, 3).map((exp, index) => (
                              <Chip
                                key={index}
                                label={exp}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {reviewer.expertise.length > 3 && (
                              <Chip
                                label={`+${reviewer.expertise.length - 3} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                fullWidth
                onClick={handleAssignReviewer}
                disabled={loading || !selectedSubmission || !selectedReviewer}
              >
                {loading ? <CircularProgress size={24} /> : 'Assign Reviewer'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Current Assignments */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Current Assignments ({assignments.length})
              </Typography>

              <List>
                {assignments.map((assignment) => (
                  <ListItem key={assignment.reviewId} divider>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {assignment.submissionTitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Reviewer: {assignment.reviewerName}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box display="flex" gap={1} mt={0.5}>
                          <Chip
                            label={assignment.sessionType}
                            size="small"
                            sx={{ 
                              backgroundColor: getSessionTypeColor(assignment.sessionType),
                              color: 'white'
                            }}
                          />
                          <Chip
                            label={assignment.isCompleted ? 'Completed' : 'Pending'}
                            size="small"
                            color={assignment.isCompleted ? 'success' : 'warning'}
                          />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      {!assignment.isCompleted && (
                        <Tooltip title="Remove Assignment">
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveAssignment(assignment.reviewId)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {assignments.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No assignments yet"
                      secondary="Start by assigning reviewers to submissions"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Suggestions Dialog */}
      <Dialog
        open={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Reviewer Suggestions
        </DialogTitle>
        <DialogContent>
          {suggestionsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {suggestions.map((suggestion) => (
                <ListItem key={suggestion.reviewerId} divider>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {suggestion.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {suggestion.affiliation}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box mt={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Chip
                            label={`Match Score: ${suggestion.matchScore}`}
                            size="small"
                            sx={{ 
                              backgroundColor: getMatchScoreColor(suggestion.matchScore),
                              color: 'white'
                            }}
                          />
                          <Typography variant="caption">
                            {suggestion.matchReason}
                          </Typography>
                        </Box>
                        <Typography variant="caption" display="block">
                          Current assignments: {suggestion.currentAssignments}
                        </Typography>
                        {suggestion.expertise.length > 0 && (
                          <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                            {suggestion.expertise.slice(0, 4).map((exp, index) => (
                              <Chip
                                key={index}
                                label={exp}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleAssignFromSuggestion(suggestion.reviewerId)}
                    >
                      Select
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {suggestions.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No suggestions available"
                    secondary="All suitable reviewers may already be assigned"
                  />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuggestionsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewerAssignment;