import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  AttachFile as FileIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { PaymentStatusInfo, SubmitPaymentProofRequest, PaymentMethod } from '../types/payment';
import { paymentApi } from '../services/paymentApi';

const PaymentSubmission: React.FC = () => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    amount: 0,
    currency: 'USD',
    paymentMethod: 'bank_transfer' as PaymentMethod,
    transactionReference: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadPaymentStatus();
  }, []);

  const loadPaymentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await paymentApi.getPaymentStatus();
      setPaymentStatus(status);
      
      // Pre-fill amount with registration fee
      setFormData(prev => ({
        ...prev,
        amount: status.registrationFee,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment status');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPEG, PNG, and PDF files are allowed');
        return;
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a proof of payment file');
      return;
    }

    if (!paymentStatus) {
      setError('Payment status not loaded');
      return;
    }

    // Validate amount matches registration fee
    if (formData.amount !== paymentStatus.registrationFee) {
      setError(`Payment amount must match registration fee of ${paymentApi.formatCurrency(paymentStatus.registrationFee)}`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const paymentData: SubmitPaymentProofRequest = {
        ...formData,
        proofFile: selectedFile,
      };

      const response = await paymentApi.submitProofOfPayment(paymentData);
      
      if (response.success) {
        setSuccess(response.message || 'Proof of payment submitted successfully');
        
        // Reset form
        setSelectedFile(null);
        setFormData(prev => ({
          ...prev,
          transactionReference: '',
        }));
        
        // Reload payment status
        await loadPaymentStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit proof of payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!paymentStatus) {
    return (
      <Alert severity="error">
        Failed to load payment information
      </Alert>
    );
  }

  if (!paymentStatus.canSubmitPayment) {
    return (
      <Alert severity="info">
        You cannot submit payment proof at this time. Current status: {paymentApi.getStatusDisplayText(paymentStatus.paymentStatus)}
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Submit Proof of Payment
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Please upload your proof of payment (bank transfer receipt, screenshot, or PDF) along with the payment details.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Payment Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Payment Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
                helperText={`Registration fee: ${paymentApi.formatCurrency(paymentStatus.registrationFee)}`}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Currency"
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={formData.paymentMethod}
                  label="Payment Method"
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                >
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Transaction Reference (Optional)"
                value={formData.transactionReference}
                onChange={(e) => handleInputChange('transactionReference', e.target.value)}
                helperText="Reference number from your bank or payment provider"
              />
            </Grid>

            {/* File Upload */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Proof of Payment
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: selectedFile ? 'success.main' : 'grey.300',
                  bgcolor: selectedFile ? 'success.50' : 'grey.50',
                }}
              >
                <input
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  id="proof-file-upload"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="proof-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    sx={{ mb: 2 }}
                  >
                    Choose File
                  </Button>
                </label>

                {selectedFile ? (
                  <Box>
                    <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                      <FileIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="body2" color="success.main">
                        {selectedFile.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Upload your payment receipt, bank transfer confirmation, or screenshot
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Supported formats: JPEG, PNG, PDF (max 5MB)
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
                  disabled={submitting || !selectedFile}
                >
                  {submitting ? 'Submitting...' : 'Submit Proof of Payment'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentSubmission;