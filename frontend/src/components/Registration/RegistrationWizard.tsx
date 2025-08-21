import React, { useState } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  Typography,
  Paper,
  Container,
} from '@mui/material';
import { ArrowBack, ArrowForward, Check } from '@mui/icons-material';
import { ParticipantTypeSelection } from './ParticipantTypeSelection';
import { PersonalInformation } from './PersonalInformation';
import { SessionSelection } from './SessionSelection';
import { ReviewAndSubmit } from './ReviewAndSubmit';
import { ParticipantType, SessionType } from '../../types/user';

const steps = [
  'Participant Type',
  'Personal Information',
  'Session Selection',
  'Review & Submit'
];

export interface RegistrationData {
  participantType: ParticipantType | null;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  affiliation: string;
  country: string;
  bio: string;
  expertise: string[];
  selectedSessions: SessionType[];
}

const initialData: RegistrationData = {
  participantType: null,
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  affiliation: '',
  country: '',
  bio: '',
  expertise: [],
  selectedSessions: [],
};

interface RegistrationWizardProps {
  onComplete: (data: RegistrationData) => void;
  onCancel: () => void;
}

export const RegistrationWizard: React.FC<RegistrationWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [registrationData, setRegistrationData] = useState<RegistrationData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateData = (updates: Partial<RegistrationData>) => {
    setRegistrationData(prev => ({ ...prev, ...updates }));
    // Clear related errors when data is updated
    const updatedFields = Object.keys(updates);
    setErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Participant Type
        if (!registrationData.participantType) {
          newErrors.participantType = 'Please select a participant type';
        }
        break;
      
      case 1: // Personal Information
        if (!registrationData.firstName.trim()) {
          newErrors.firstName = 'First name is required';
        }
        if (!registrationData.lastName.trim()) {
          newErrors.lastName = 'Last name is required';
        }
        if (!registrationData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(registrationData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        if (!registrationData.password.trim()) {
          newErrors.password = 'Password is required';
        } else if (registrationData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        if (!registrationData.affiliation.trim()) {
          newErrors.affiliation = 'Affiliation is required';
        }
        if (!registrationData.country.trim()) {
          newErrors.country = 'Country is required';
        }
        break;
      
      case 2: // Session Selection
        if (registrationData.selectedSessions.length === 0) {
          newErrors.selectedSessions = 'Please select at least one session';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (validateStep(activeStep)) {
      onComplete(registrationData);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <ParticipantTypeSelection
            selectedType={registrationData.participantType}
            onTypeSelect={(type) => updateData({ participantType: type })}
            error={errors.participantType}
          />
        );
      case 1:
        return (
          <PersonalInformation
            data={registrationData}
            onChange={updateData}
            errors={errors}
          />
        );
      case 2:
        return (
          <SessionSelection
            selectedSessions={registrationData.selectedSessions}
            onSessionsChange={(sessions) => updateData({ selectedSessions: sessions })}
            participantType={registrationData.participantType}
            error={errors.selectedSessions}
          />
        );
      case 3:
        return (
          <ReviewAndSubmit
            data={registrationData}
            onEdit={(step) => setActiveStep(step)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Conference Registration
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400, mb: 4 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={activeStep === 0 ? onCancel : handleBack}
            startIcon={<ArrowBack />}
            variant="outlined"
          >
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          
          <Button
            onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
            endIcon={activeStep === steps.length - 1 ? <Check /> : <ArrowForward />}
            variant="contained"
          >
            {activeStep === steps.length - 1 ? 'Submit Registration' : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};