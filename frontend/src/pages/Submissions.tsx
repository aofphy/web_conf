import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  Button
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import SubmissionDashboard from '../components/SubmissionDashboard';
import SubmissionForm from '../components/SubmissionForm';
import { SESSION_INFO } from '../types/submission';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`submission-tabpanel-${index}`}
      aria-labelledby={`submission-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Submissions: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSubmissionCreated = () => {
    // Switch to dashboard tab after creating submission
    setActiveTab(0);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Abstract Submissions
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Submit and manage your research abstracts for the International Conference
        </Typography>

        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="submission tabs">
              <Tab
                icon={<DashboardIcon />}
                label="My Submissions"
                id="submission-tab-0"
                aria-controls="submission-tabpanel-0"
              />
              <Tab
                icon={<AddIcon />}
                label="New Submission"
                id="submission-tab-1"
                aria-controls="submission-tabpanel-1"
              />
              <Tab
                icon={<InfoIcon />}
                label="Guidelines"
                id="submission-tab-2"
                aria-controls="submission-tabpanel-2"
              />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <SubmissionDashboard onCreateSubmission={() => setActiveTab(1)} />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <SubmissionForm
              onSubmissionCreated={handleSubmissionCreated}
              onCancel={() => setActiveTab(0)}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h4" gutterBottom>
                Submission Guidelines
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Important:</strong> Your payment must be verified before you can submit abstracts. 
                  Please ensure your registration fee payment has been processed.
                </Typography>
              </Alert>

              <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                Conference Sessions
              </Typography>
              <Typography variant="body1" paragraph>
                The conference is organized into five main academic sessions. Please select the most appropriate session for your research:
              </Typography>

              {Object.entries(SESSION_INFO).map(([key, info]) => (
                <Paper key={key} sx={{ p: 3, mb: 2 }} variant="outlined">
                  <Typography variant="h6" gutterBottom>
                    {key} - {info.name}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {info.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Guidelines:</strong> {info.guidelines}
                  </Typography>
                </Paper>
              ))}

              <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                Presentation Types
              </Typography>
              
              <Paper sx={{ p: 3, mb: 2 }} variant="outlined">
                <Typography variant="h6" gutterBottom>
                  Oral Presentation
                </Typography>
                <Typography variant="body2" paragraph>
                  Present your work in a 15-20 minute talk followed by Q&A session. Oral presentations are typically selected for high-impact research with broad appeal to the conference audience.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Duration:</strong> 15-20 minutes + 5 minutes Q&A
                </Typography>
              </Paper>

              <Paper sx={{ p: 3, mb: 2 }} variant="outlined">
                <Typography variant="h6" gutterBottom>
                  Poster Presentation
                </Typography>
                <Typography variant="body2" paragraph>
                  Display your work on a poster during dedicated poster sessions. This format allows for more detailed discussions with interested attendees and is excellent for work in progress or specialized research.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Duration:</strong> 2-3 hour poster session
                </Typography>
              </Paper>

              <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                Abstract Requirements
              </Typography>
              
              <Box component="ul" sx={{ pl: 3 }}>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Length:</strong> 100-500 words (excluding title and author information)
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Format:</strong> Use Markdown formatting for better presentation
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Structure:</strong> Include background, methodology, key results, and conclusions
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Keywords:</strong> Provide 3-10 relevant keywords
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Authors:</strong> List all authors with complete affiliations and email addresses
                  </Typography>
                </li>
              </Box>

              <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                Review Process
              </Typography>
              
              <Typography variant="body1" paragraph>
                All submissions undergo peer review by our scientific committee:
              </Typography>
              
              <Box component="ol" sx={{ pl: 3 }}>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Initial Review:</strong> Submissions are checked for completeness and relevance
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Peer Review:</strong> Qualified reviewers evaluate scientific merit and presentation quality
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Decision:</strong> Authors receive notification of acceptance, rejection, or revision requests
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" paragraph>
                    <strong>Final Preparation:</strong> Accepted submissions are included in the conference program
                  </Typography>
                </li>
              </Box>

              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Deadline Notice:</strong> Submissions can only be edited until the submission deadline. 
                  After the deadline, no changes will be accepted. Please review your submission carefully before the deadline.
                </Typography>
              </Alert>

              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={() => setActiveTab(1)}
                >
                  Start New Submission
                </Button>
              </Box>
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default Submissions;