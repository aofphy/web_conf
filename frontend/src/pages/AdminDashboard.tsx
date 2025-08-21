import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  People,
  Assignment,
  Settings,
  Analytics
} from '@mui/icons-material';
import AdminUserManagement from '../components/AdminUserManagement';
import AdminSubmissionMonitoring from '../components/AdminSubmissionMonitoring';
import AdminSystemConfig from '../components/AdminSystemConfig';

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
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

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

const AdminDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>
      
      <Paper sx={{ width: '100%', mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="admin dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              icon={<People />} 
              label="User Management" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<Assignment />} 
              label="Submissions & Reviews" 
              {...a11yProps(1)} 
            />
            <Tab 
              icon={<Settings />} 
              label="System Configuration" 
              {...a11yProps(2)} 
            />
            <Tab 
              icon={<Analytics />} 
              label="Analytics" 
              {...a11yProps(3)} 
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <AdminUserManagement />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <AdminSubmissionMonitoring />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <AdminSystemConfig />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h5" gutterBottom>
            Analytics & Reports
          </Typography>
          <Typography color="text.secondary">
            Advanced analytics will be available here
          </Typography>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default AdminDashboard;