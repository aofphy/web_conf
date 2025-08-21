import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import ReviewerDashboard from '../components/ReviewerDashboard';
import ReviewerAssignment from '../components/ReviewerAssignment';
import ReviewProgress from '../components/ReviewProgress';

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
      id={`review-tabpanel-${index}`}
      aria-labelledby={`review-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Reviews: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserRole(data.data.role);
      } else {
        setError('Failed to fetch user profile');
      }
    } catch (err) {
      setError('Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const isAdmin = userRole === 'admin' || userRole === 'organizer';
  const isReviewer = userRole === 'reviewer' || isAdmin;

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
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  if (!isReviewer && !isAdmin) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          You don't have permission to access the review system. 
          Please contact an administrator if you believe this is an error.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h3" gutterBottom>
        Review System
      </Typography>

      {(isReviewer && isAdmin) ? (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="My Reviews" />
              <Tab label="Manage Assignments" />
              <Tab label="Review Progress" />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <ReviewerDashboard />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <ReviewerAssignment />
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <ReviewProgress />
          </TabPanel>
        </>
      ) : isReviewer ? (
        <ReviewerDashboard />
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="Manage Assignments" />
              <Tab label="Review Progress" />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <ReviewerAssignment />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <ReviewProgress />
          </TabPanel>
        </>
      )}
    </Box>
  );
};

export default Reviews;