import React from 'react';
import {
  Container,
  Typography,
  Box,
} from '@mui/material';
import {
  AccountBalance as PaymentIcon,
} from '@mui/icons-material';
import PaymentVerificationPanel from '../components/PaymentVerificationPanel';

const AdminPayments: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Page Header */}
        <Box display="flex" alignItems="center" mb={4}>
          <PaymentIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Payment Administration
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review and verify participant payment submissions
            </Typography>
          </Box>
        </Box>

        {/* Payment Verification Panel */}
        <PaymentVerificationPanel />
      </Box>
    </Container>
  );
};

export default AdminPayments;