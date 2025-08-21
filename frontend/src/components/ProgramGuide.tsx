import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Web as WebIcon,
} from '@mui/icons-material';
import { Conference } from '../types/conference';

interface ProgramGuideProps {
  conference: Conference;
}

const ProgramGuide: React.FC<ProgramGuideProps> = ({ conference }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const sessionNames: Record<string, string> = {
    CHE: 'Computational Chemistry',
    CSE: 'Computer Science & Engineering',
    BIO: 'Computational Biology & Bioinformatics',
    MST: 'Mathematics & Statistics',
    PFD: 'Computational Physics & Fluid Dynamics',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handlePreviewOpen = () => {
    setPreviewOpen(true);
  };

  const handlePreviewClose = () => {
    setPreviewOpen(false);
  };

  const handleDownload = async (format: 'pdf' | 'html' | 'docx') => {
    setGenerating(true);
    try {
      // This would typically call an API endpoint to generate the program guide
      // For now, we'll simulate the download
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a simple HTML version for demonstration
      if (format === 'html') {
        const htmlContent = generateHtmlProgram();
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${conference.name.replace(/\s+/g, '_')}_Program.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For PDF and DOCX, we would typically call the backend API
        console.log(`Generating ${format.toUpperCase()} program guide...`);
        alert(`${format.toUpperCase()} generation would be handled by the backend API`);
      }
    } catch (error) {
      console.error('Error generating program guide:', error);
      alert('Failed to generate program guide. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const generateHtmlProgram = () => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${conference.name} - Program Guide</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; }
        .section { margin-bottom: 30px; }
        .session { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; }
        .schedule-item { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${conference.name}</h1>
        <p><strong>Dates:</strong> ${formatDate(conference.startDate)} - ${formatDate(conference.endDate)}</p>
        <p><strong>Venue:</strong> ${conference.venue}</p>
    </div>

    <div class="section">
        <h2>Conference Overview</h2>
        <p>${conference.description || 'Welcome to our international conference.'}</p>
    </div>

    <div class="section">
        <h2>Session Schedule</h2>
        ${conference.sessions.map(session => `
            <div class="session">
                <h3>${session.name} (${session.type})</h3>
                <p><strong>Track:</strong> ${sessionNames[session.type] || session.type}</p>
                ${session.description ? `<p>${session.description}</p>` : ''}
                
                ${session.schedules && session.schedules.length > 0 ? `
                    <h4>Schedule</h4>
                    <table>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Location</th>
                            <th>Description</th>
                        </tr>
                        ${session.schedules.map(schedule => `
                            <tr>
                                <td>${formatDate(schedule.startTime)}</td>
                                <td>${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</td>
                                <td>${schedule.location || 'TBA'}</td>
                                <td>${schedule.description || 'Session details'}</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : '<p>Schedule to be announced</p>'}
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Important Information</h2>
        <p><strong>Submission Deadline:</strong> ${formatDate(conference.submissionDeadline)}</p>
        <p><strong>Registration Deadline:</strong> ${formatDate(conference.registrationDeadline)}</p>
    </div>
</body>
</html>`;
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <DocIcon sx={{ mr: 1 }} />
            Program Guide
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Download the complete conference program guide in your preferred format.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Button
                variant="outlined"
                startIcon={generating ? <CircularProgress size={16} /> : <PdfIcon />}
                onClick={() => handleDownload('pdf')}
                fullWidth
                disabled={generating}
              >
                PDF Format
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="outlined"
                startIcon={generating ? <CircularProgress size={16} /> : <WebIcon />}
                onClick={() => handleDownload('html')}
                fullWidth
                disabled={generating}
              >
                HTML Format
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="outlined"
                startIcon={generating ? <CircularProgress size={16} /> : <DocIcon />}
                onClick={() => handleDownload('docx')}
                fullWidth
                disabled={generating}
              >
                Word Format
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="text"
              onClick={handlePreviewOpen}
              size="small"
            >
              Preview Program Content
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handlePreviewClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Program Guide Preview</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {conference.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(conference.startDate)} - {formatDate(conference.endDate)} | {conference.venue}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Sessions Overview
          </Typography>
          <List>
            {conference.sessions.map((session) => (
              <ListItem key={session.id}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">{session.name}</Typography>
                      <Chip label={session.type} size="small" />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {sessionNames[session.type] || session.type}
                      </Typography>
                      {session.schedules && session.schedules.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {session.schedules.length} scheduled event(s)
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>

          {conference.sessions.length === 0 && (
            <Alert severity="info">
              Session information will be available in the final program guide.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePreviewClose}>Close</Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              handlePreviewClose();
              handleDownload('html');
            }}
          >
            Download HTML
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProgramGuide;