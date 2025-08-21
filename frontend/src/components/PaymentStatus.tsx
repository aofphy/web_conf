import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as VerifiedIcon,
  Schedule as PendingIcon,
  Cancel as RejectedIcon,
} from '@mui/icons-material';
import { PaymentStatusInfo } from '../types/payment';
import { paymentApi } from '../services/paymentApi';

const PaymentStatus: React.FC = () => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentStatus();
  }, []);

  const loadPaymentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await paymentApi.getPaymentStatus();
      setPaymentStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment status');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadProof = async (paymentId: string, fileName?: string) => {
    try {
      setDownloading(paymentId);
      const blob = await paymentApi.downloadProofOfPayment(paymentId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `payment_proof_${paymentId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download proof of payment');
    } finally {
      setDownloading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <VerifiedIcon color="success" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      case 'rejected':
        return <RejectedIcon color="error" />;
      default:
        return undefined;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
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
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={loadPaymentStatus}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!paymentStatus) {
    return (
      <Alert severity="warning">
        Payment status information not available
      </Alert>
    );
  }

  return (
    <Box>
      {/* Current Status Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Payment Status
            </Typography>
            <Tooltip title="Refresh">
              <IconButton onClick={loadPaymentStatus} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography variant="body1">
              Current Status:
            </Typography>
            <Chip
              label={paymentApi.getStatusDisplayText(paymentStatus.paymentStatus)}
              color={paymentApi.getStatusColor(paymentStatus.paymentStatus) as any}
              icon={getStatusIcon(paymentStatus.paymentStatus)}
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            Registration Fee: {paymentApi.formatCurrency(paymentStatus.registrationFee)}
          </Typography>

          {paymentStatus.latestPayment && (
            <Box mt={2}>
              <Alert 
                severity={
                  paymentStatus.latestPayment.status === 'verified' ? 'success' :
                  paymentStatus.latestPayment.status === 'pending' ? 'info' : 'warning'
                }
              >
                {paymentStatus.latestPayment.status === 'verified' && 
                  'Your payment has been verified. You now have full access to conference features.'}
                {paymentStatus.latestPayment.status === 'pending' && 
                  'Your payment is under review. You will be notified once it has been processed.'}
                {paymentStatus.latestPayment.status === 'rejected' && 
                  `Your payment was rejected. ${paymentStatus.latestPayment.adminNotes ? `Reason: ${paymentStatus.latestPayment.adminNotes}` : 'Please contact support for more information.'}`}
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {paymentStatus.paymentRecords.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Payment History
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentStatus.paymentRecords.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Typography variant="body2">
                          {paymentApi.formatDate(payment.paymentDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {paymentApi.formatCurrency(payment.amount, payment.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {payment.transactionReference || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={payment.status.toUpperCase()}
                          color={getStatusColor(payment.status)}
                          size="small"
                          icon={getStatusIcon(payment.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {payment.proofOfPaymentPath && (
                          <Tooltip title="Download Proof of Payment">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadProof(payment.id)}
                              disabled={downloading === payment.id}
                            >
                              {downloading === payment.id ? (
                                <CircularProgress size={20} />
                              ) : (
                                <DownloadIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {paymentStatus.latestPayment?.adminNotes && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Admin Notes:
                </Typography>
                <Alert severity="info">
                  {paymentStatus.latestPayment.adminNotes}
                </Alert>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {paymentStatus.paymentRecords.length === 0 && (
        <Alert severity="info">
          No payment records found. Submit your first payment proof to get started.
        </Alert>
      )}
    </Box>
  );
};

export default PaymentStatus;