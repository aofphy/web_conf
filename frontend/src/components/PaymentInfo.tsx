import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Paper,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  Info as InfoIcon,
  ContactSupport as SupportIcon,
} from '@mui/icons-material';
import { PaymentInfo as PaymentInfoType } from '../types/payment';
import { paymentApi } from '../services/paymentApi';

const PaymentInfo: React.FC = () => {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentInfo();
  }, []);

  const loadPaymentInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await paymentApi.getPaymentInfo();
      setPaymentInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!paymentInfo) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Payment information not available
      </Alert>
    );
  }

  const { user, paymentInstructions } = paymentInfo;

  return (
    <Box>
      {/* User Payment Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Registration Fee Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Participant Type
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {user.participantType.replace(/_/g, ' ').toUpperCase()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Registration Fee
              </Typography>
              <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                {paymentApi.formatCurrency(user.registrationFee)}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Payment Status
              </Typography>
              <Chip
                label={paymentApi.getStatusDisplayText(user.paymentStatus)}
                color={paymentApi.getStatusColor(user.paymentStatus) as any}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Payment Instructions
            </Typography>
          </Box>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            {paymentInstructions.instructions}
          </Alert>

          <Divider sx={{ my: 2 }} />

          {/* Bank Details */}
          <Box display="flex" alignItems="center" mb={2}>
            <BankIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Bank Transfer Details
            </Typography>
          </Box>

          <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Bank Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {paymentInstructions.bankDetails.bankName}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Account Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {paymentInstructions.bankDetails.accountName}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Account Number
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium', fontFamily: 'monospace' }}>
                  {paymentInstructions.bankDetails.accountNumber}
                </Typography>
              </Grid>
              {paymentInstructions.bankDetails.swiftCode && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    SWIFT Code
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium', fontFamily: 'monospace' }}>
                    {paymentInstructions.bankDetails.swiftCode}
                  </Typography>
                </Grid>
              )}
              {paymentInstructions.bankDetails.routingNumber && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Routing Number
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium', fontFamily: 'monospace' }}>
                    {paymentInstructions.bankDetails.routingNumber}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Accepted Payment Methods */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Accepted Payment Methods
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {paymentInstructions.acceptedMethods.map((method, index) => (
              <Chip
                key={index}
                label={method}
                variant="outlined"
                size="small"
              />
            ))}
          </Box>

          {/* Support Contact */}
          {paymentInstructions.supportContact && (
            <Box display="flex" alignItems="center" mt={2}>
              <SupportIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Support Contact: {paymentInstructions.supportContact}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentInfo;