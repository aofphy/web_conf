import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Info as InfoIcon,
  CloudUpload as UploadIcon,
  Timeline as StatusIcon,
} from '@mui/icons-material';
import PaymentInfo from '../components/PaymentInfo';
import PaymentSubmission from '../components/PaymentSubmission';
import PaymentStatus from '../components/PaymentStatus';

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
      id={`payment-tabpanel-${index}`}
      aria-labelledby={`payment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `payment-tab-${index}`,
    'aria-controls': `payment-tabpanel-${index}`,
  };
}

const Payment: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Page Header */}
        <Box display="flex" alignItems="center" mb={4}>
          <PaymentIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Payment Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your conference registration payment and track verification status
            </Typography>
          </Box>
        </Box>

        {/* Navigation Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="payment management tabs"
            variant="fullWidth"
          >
            <Tab
              icon={<InfoIcon />}
              label="Payment Information"
              {...a11yProps(0)}
            />
            <Tab
              icon={<UploadIcon />}
              label="Submit Payment"
              {...a11yProps(1)}
            />
            <Tab
              icon={<StatusIcon />}
              label="Payment Status"
              {...a11yProps(2)}
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <TabPanel value={tabValue} index={0}>
          <PaymentInfo />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <PaymentSubmission />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <PaymentStatus />
        </TabPanel>
      </Box>
    </Container>
  );
};

export default Payment;