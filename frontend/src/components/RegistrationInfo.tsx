import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Info as InfoIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { RegistrationFee, PaymentInstructions } from '../types/conference';

interface RegistrationInfoProps {
  conferenceId: string;
  registrationFees: RegistrationFee[];
  paymentInstructions?: PaymentInstructions;
}

const RegistrationInfo: React.FC<RegistrationInfoProps> = ({
  registrationFees,
  paymentInstructions,
}) => {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const participantTypeLabels: Record<string, string> = {
    keynote_speaker: 'Keynote Speaker',
    oral_presenter: 'Oral Presenter',
    poster_presenter: 'Poster Presenter',
    panelist: 'Panelist',
    workshop_leader: 'Workshop Leader',
    regular_participant: 'Regular Participant',
    observer: 'Observer',
    industry_representative: 'Industry Representative',
    conference_chair: 'Conference Chair',
    scientific_committee: 'Scientific Committee',
    organizing_committee: 'Organizing Committee',
    session_chair: 'Session Chair',
    reviewer: 'Reviewer',
    technical_support: 'Technical Support',
    volunteer: 'Volunteer',
    sponsor: 'Sponsor',
    government_representative: 'Government Representative',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCurrentFee = (fee: RegistrationFee) => {
    const now = new Date();
    const earlyBirdDeadline = new Date(fee.earlyBirdDeadline);
    const lateRegistrationStart = new Date(fee.lateRegistrationStart);

    if (now <= earlyBirdDeadline) {
      return { amount: fee.earlyBirdFee, type: 'Early Bird' };
    } else if (now < lateRegistrationStart) {
      return { amount: fee.regularFee, type: 'Regular' };
    } else {
      return { amount: fee.lateFee, type: 'Late Registration' };
    }
  };

  const handlePaymentInfoClick = () => {
    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <PaymentIcon sx={{ mr: 1 }} />
            Registration Information
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {registrationFees && registrationFees.length > 0 ? (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Participant Type</strong></TableCell>
                      <TableCell align="right"><strong>Current Fee</strong></TableCell>
                      <TableCell align="center"><strong>Rate Type</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {registrationFees.map((fee) => {
                      const currentFee = getCurrentFee(fee);
                      return (
                        <TableRow key={fee.id}>
                          <TableCell>
                            <Typography variant="body2">
                              {participantTypeLabels[fee.participantType] || fee.participantType}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {currentFee.amount} {fee.currency}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={currentFee.type}
                              size="small"
                              color={
                                currentFee.type === 'Early Bird' ? 'success' :
                                currentFee.type === 'Regular' ? 'primary' : 'warning'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Registration Deadlines:
                </Typography>
                {registrationFees.length > 0 && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Early Bird:</strong> Until {formatDate(registrationFees[0].earlyBirdDeadline)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Regular:</strong> Until {formatDate(registrationFees[0].lateRegistrationStart)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Late Registration:</strong> After {formatDate(registrationFees[0].lateRegistrationStart)}
                    </Typography>
                  </Box>
                )}
              </Box>

              {paymentInstructions && (
                <Button
                  variant="outlined"
                  startIcon={<InfoIcon />}
                  onClick={handlePaymentInfoClick}
                  fullWidth
                >
                  View Payment Instructions
                </Button>
              )}
            </>
          ) : (
            <Alert severity="info">
              Registration fees will be announced soon. Please check back later.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment Instructions Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={handleClosePaymentDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <BankIcon sx={{ mr: 1 }} />
          Payment Instructions
        </DialogTitle>
        <DialogContent>
          {paymentInstructions ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Bank Transfer Details
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2"><strong>Bank Name:</strong> {paymentInstructions.bankName}</Typography>
                <Typography variant="body2"><strong>Account Name:</strong> {paymentInstructions.accountName}</Typography>
                <Typography variant="body2"><strong>Account Number:</strong> {paymentInstructions.accountNumber}</Typography>
                {paymentInstructions.swiftCode && (
                  <Typography variant="body2"><strong>SWIFT Code:</strong> {paymentInstructions.swiftCode}</Typography>
                )}
                {paymentInstructions.routingNumber && (
                  <Typography variant="body2"><strong>Routing Number:</strong> {paymentInstructions.routingNumber}</Typography>
                )}
              </Paper>

              {paymentInstructions.acceptedMethods && paymentInstructions.acceptedMethods.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Accepted Payment Methods
                  </Typography>
                  <List dense>
                    {paymentInstructions.acceptedMethods.map((method, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={method} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Instructions
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {paymentInstructions.instructions}
                </Typography>
              </Box>

              {paymentInstructions.supportContact && (
                <Alert severity="info">
                  <strong>Need Help?</strong> Contact us at: {paymentInstructions.supportContact}
                </Alert>
              )}
            </Box>
          ) : (
            <Alert severity="warning">
              Payment instructions are not available at this time.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RegistrationInfo;