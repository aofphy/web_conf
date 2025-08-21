import React, { useState, useEffect } from 'react';
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
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CheckCircle as VerifyIcon,
  Cancel as RejectIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { adminPaymentApi, PendingPaymentWithUser, PaymentStatistics } from '../services/adminPaymentApi';
import { PaymentRecord } from '../types/payment';

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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PaymentVerificationPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentWithUser[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [verifyDialog, setVerifyDialog] = useState<{ open: boolean; payment: PendingPaymentWithUser | null }>({
    open: false,
    payment: null,
  });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; payment: PendingPaymentWithUser | null }>({
    open: false,
    payment: null,
  });
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [pendingData, allData, statsData] = await Promise.all([
        adminPaymentApi.getPendingPayments(),
        adminPaymentApi.getAllPayments(),
        adminPaymentApi.getPaymentStatistics(),
      ]);

      setPendingPayments(pendingData);
      setAllPayments(allData);
      setStatistics(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleVerifyPayment = async () => {
    if (!verifyDialog.payment) return;

    try {
      setProcessing(verifyDialog.payment.id);
      await adminPaymentApi.verifyPayment(verifyDialog.payment.id, adminNotes);
      
      setSuccess('Payment verified successfully');
      setVerifyDialog({ open: false, payment: null });
      setAdminNotes('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify payment');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectDialog.payment || !adminNotes.trim()) {
      setError('Admin notes are required when rejecting a payment');
      return;
    }

    try {
      setProcessing(rejectDialog.payment.id);
      await adminPaymentApi.rejectPayment(rejectDialog.payment.id, adminNotes);
      
      setSuccess('Payment rejected successfully');
      setRejectDialog({ open: false, payment: null });
      setAdminNotes('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject payment');
    } finally {
      setProcessing(null);
    }
  };

  const handleDownloadProof = async (paymentId: string, fileName?: string) => {
    try {
      setDownloading(paymentId);
      const blob = await adminPaymentApi.downloadProofOfPayment(paymentId);
      
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Payment Verification
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Alerts */}
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

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Payments
                </Typography>
                <Typography variant="h4">
                  {statistics.totalPayments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending Review
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {statistics.pendingPayments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Verified
                </Typography>
                <Typography variant="h4" color="success.main">
                  {statistics.verifiedPayments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Amount
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {adminPaymentApi.formatCurrency(statistics.totalAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab label={`Pending Review (${pendingPayments.length})`} />
          <Tab label={`All Payments (${allPayments.length})`} />
        </Tabs>
      </Paper>

      {/* Pending Payments Tab */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Payments Awaiting Verification
            </Typography>
            
            {pendingPayments.length === 0 ? (
              <Alert severity="info">
                No pending payments to review
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Participant Type</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Payment Date</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Reference</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {payment.userInfo?.firstName} {payment.userInfo?.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {payment.userInfo?.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={adminPaymentApi.getParticipantTypeDisplay(payment.userInfo?.participantType || '')}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {adminPaymentApi.formatCurrency(payment.amount, payment.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {adminPaymentApi.formatDate(payment.paymentDate)}
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
                          <Box display="flex" gap={1}>
                            {payment.proofOfPaymentPath && (
                              <Tooltip title="Download Proof">
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
                            <Tooltip title="Verify Payment">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => setVerifyDialog({ open: true, payment })}
                                disabled={processing === payment.id}
                              >
                                <VerifyIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject Payment">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setRejectDialog({ open: true, payment })}
                                disabled={processing === payment.id}
                              >
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* All Payments Tab */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Payment Records
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Payment Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Verified By</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Typography variant="body2">
                          {adminPaymentApi.formatDate(payment.paymentDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {adminPaymentApi.formatCurrency(payment.amount, payment.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={payment.status.toUpperCase()}
                          color={adminPaymentApi.getStatusColor(payment.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {payment.verifiedBy ? 'Admin' : '-'}
                        </Typography>
                        {payment.verificationDate && (
                          <Typography variant="caption" color="text.secondary">
                            {adminPaymentApi.formatDate(payment.verificationDate)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.proofOfPaymentPath && (
                          <Tooltip title="Download Proof">
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
          </CardContent>
        </Card>
      </TabPanel>

      {/* Verify Payment Dialog */}
      <Dialog open={verifyDialog.open} onClose={() => setVerifyDialog({ open: false, payment: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Verify Payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to verify this payment?
          </Typography>
          {verifyDialog.payment && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>User:</strong> {verifyDialog.payment.userInfo?.firstName} {verifyDialog.payment.userInfo?.lastName}
              </Typography>
              <Typography variant="body2">
                <strong>Amount:</strong> {adminPaymentApi.formatCurrency(verifyDialog.payment.amount, verifyDialog.payment.currency)}
              </Typography>
              <Typography variant="body2">
                <strong>Reference:</strong> {verifyDialog.payment.transactionReference || 'N/A'}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Admin Notes (Optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add any notes about this verification..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyDialog({ open: false, payment: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleVerifyPayment}
            variant="contained"
            color="success"
            disabled={processing !== null}
            startIcon={processing ? <CircularProgress size={20} /> : <VerifyIcon />}
          >
            Verify Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, payment: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this payment. The user will be notified.
          </Typography>
          {rejectDialog.payment && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>User:</strong> {rejectDialog.payment.userInfo?.firstName} {rejectDialog.payment.userInfo?.lastName}
              </Typography>
              <Typography variant="body2">
                <strong>Amount:</strong> {adminPaymentApi.formatCurrency(rejectDialog.payment.amount, rejectDialog.payment.currency)}
              </Typography>
              <Typography variant="body2">
                <strong>Reference:</strong> {rejectDialog.payment.transactionReference || 'N/A'}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason *"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Explain why this payment is being rejected..."
            required
            error={!adminNotes.trim()}
            helperText={!adminNotes.trim() ? 'Rejection reason is required' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, payment: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleRejectPayment}
            variant="contained"
            color="error"
            disabled={processing !== null || !adminNotes.trim()}
            startIcon={processing ? <CircularProgress size={20} /> : <RejectIcon />}
          >
            Reject Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentVerificationPanel;