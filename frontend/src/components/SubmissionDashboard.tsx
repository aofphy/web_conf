import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { SubmissionResponse, SESSION_INFO, PRESENTATION_TYPE_INFO } from '../types/submission';
import { submissionApi } from '../services/submissionApi';
import SubmissionForm from './SubmissionForm';
import { ManuscriptManager } from './ManuscriptManager';
import { markdownToHtml } from '../utils/markdown';

interface SubmissionDashboardProps {
  onCreateSubmission?: () => void;
}

const SubmissionDashboard: React.FC<SubmissionDashboardProps> = ({ onCreateSubmission }) => {
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionResponse | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuSubmissionId, setMenuSubmissionId] = useState<string | null>(null);
  const [manuscriptStatuses, setManuscriptStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await submissionApi.getUserSubmissions();
      if (response.success && response.data) {
        setSubmissions(response.data);
      } else {
        setError(response.error?.message || 'Failed to load submissions');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, submissionId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuSubmissionId(submissionId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuSubmissionId(null);
  };

  const handleView = (submission: SubmissionResponse) => {
    setSelectedSubmission(submission);
    setViewDialogOpen(true);
    handleMenuClose();
  };

  const handleEdit = (submission: SubmissionResponse) => {
    setSelectedSubmission(submission);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = (submission: SubmissionResponse) => {
    setSelectedSubmission(submission);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (!selectedSubmission) return;

    try {
      const response = await submissionApi.deleteSubmission(selectedSubmission.id);
      if (response.success) {
        setSubmissions(prev => prev.filter(s => s.id !== selectedSubmission.id));
        setDeleteDialogOpen(false);
        setSelectedSubmission(null);
      } else {
        setError(response.error?.message || 'Failed to delete submission');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete submission');
    }
  };

  const handleSubmissionUpdated = (updatedSubmission: SubmissionResponse) => {
    setSubmissions(prev => 
      prev.map(s => s.id === updatedSubmission.id ? updatedSubmission : s)
    );
    setEditDialogOpen(false);
    setSelectedSubmission(null);
  };

  const handleSubmissionCreated = (newSubmission: SubmissionResponse) => {
    setSubmissions(prev => [newSubmission, ...prev]);
    setCreateDialogOpen(false);
    onCreateSubmission?.();
  };

  const handleManuscriptUpdate = (submissionId: string, hasManuscript: boolean) => {
    setManuscriptStatuses(prev => ({
      ...prev,
      [submissionId]: hasManuscript
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'primary';
      case 'under_review': return 'warning';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <ScheduleIcon />;
      case 'under_review': return <HourglassEmptyIcon />;
      case 'accepted': return <CheckCircleIcon />;
      case 'rejected': return <CancelIcon />;
      default: return null;
    }
  };

  const canEdit = (submission: SubmissionResponse) => {
    return submission.status === 'submitted';
  };

  const canDelete = (submission: SubmissionResponse) => {
    return submission.status === 'submitted' || submission.status === 'rejected';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>My Submissions</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Submissions</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Submission
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {submissions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No submissions yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start by creating your first abstract submission
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create First Submission
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {submissions.map((submission) => (
            <Grid item xs={12} md={6} lg={4} key={submission.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Chip
                      icon={getStatusIcon(submission.status)}
                      label={submission.status.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(submission.status) as any}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, submission.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Typography variant="h6" gutterBottom sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {submission.title}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={`${submission.sessionType} - ${SESSION_INFO[submission.sessionType]?.name}`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip
                      label={PRESENTATION_TYPE_INFO[submission.presentationType]?.name}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Authors:</strong> {submission.authors.map(a => a.name).join(', ')}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Keywords:</strong> {submission.keywords.join(', ')}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Submitted: {format(new Date(submission.submissionDate), 'MMM dd, yyyy')}
                  </Typography>

                  {(submission.manuscriptPath || manuscriptStatuses[submission.id]) && (
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        icon={<AttachFileIcon />}
                        label="Manuscript Uploaded"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleView(submission)}
                  >
                    View
                  </Button>
                  {canEdit(submission) && (
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEdit(submission)}
                    >
                      Edit
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const submission = submissions.find(s => s.id === menuSubmissionId);
          if (submission) handleView(submission);
        }}>
          <ListItemIcon><ViewIcon /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        
        {menuSubmissionId && canEdit(submissions.find(s => s.id === menuSubmissionId)!) && (
          <MenuItem onClick={() => {
            const submission = submissions.find(s => s.id === menuSubmissionId);
            if (submission) handleEdit(submission);
          }}>
            <ListItemIcon><EditIcon /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}

        {menuSubmissionId && canDelete(submissions.find(s => s.id === menuSubmissionId)!) && (
          <MenuItem onClick={() => {
            const submission = submissions.find(s => s.id === menuSubmissionId);
            if (submission) handleDelete(submission);
          }}>
            <ListItemIcon><DeleteIcon /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Submission Details
          {selectedSubmission && (
            <Chip
              icon={getStatusIcon(selectedSubmission.status)}
              label={selectedSubmission.status.replace('_', ' ').toUpperCase()}
              color={getStatusColor(selectedSubmission.status) as any}
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedSubmission.title}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Session:</strong> {selectedSubmission.sessionType} - {SESSION_INFO[selectedSubmission.sessionType]?.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Presentation:</strong> {PRESENTATION_TYPE_INFO[selectedSubmission.presentationType]?.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Submitted:</strong> {format(new Date(selectedSubmission.submissionDate), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Submission ID:</strong> {selectedSubmission.id}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>Authors</Typography>
              {selectedSubmission.authors.map((author, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{author.name}</strong>
                    {author.isCorresponding && <Chip label="Corresponding" size="small" sx={{ ml: 1 }} />}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {author.affiliation} • {author.email}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>Keywords</Typography>
              <Box sx={{ mb: 2 }}>
                {selectedSubmission.keywords.map((keyword, index) => (
                  <Chip key={index} label={keyword} size="small" sx={{ mr: 1, mb: 1 }} />
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>Abstract</Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                {selectedSubmission.abstractHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedSubmission.abstractHtml }} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(selectedSubmission.abstract) }} />
                )}
              </Paper>

              <Divider sx={{ my: 2 }} />

              <ManuscriptManager
                submission={selectedSubmission}
                onManuscriptUpdate={(hasManuscript) => 
                  handleManuscriptUpdate(selectedSubmission.id, hasManuscript)
                }
                readOnly={false}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedSubmission && canEdit(selectedSubmission) && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                setViewDialogOpen(false);
                handleEdit(selectedSubmission);
              }}
            >
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          {selectedSubmission && (
            <SubmissionForm
              initialData={{
                title: selectedSubmission.title,
                abstract: selectedSubmission.abstract,
                keywords: selectedSubmission.keywords,
                sessionType: selectedSubmission.sessionType,
                presentationType: selectedSubmission.presentationType,
                authors: selectedSubmission.authors.map(a => ({
                  name: a.name,
                  affiliation: a.affiliation,
                  email: a.email,
                  isCorresponding: a.isCorresponding,
                  authorOrder: a.authorOrder
                })),
                correspondingAuthor: selectedSubmission.correspondingAuthor
              }}
              isEditing={true}
              submissionId={selectedSubmission.id}
              onSubmissionCreated={handleSubmissionUpdated}
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          <SubmissionForm
            onSubmissionCreated={handleSubmissionCreated}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the submission "{selectedSubmission?.title}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubmissionDashboard;