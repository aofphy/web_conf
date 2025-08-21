import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import { AbstractBookGenerator } from '../components/AbstractBookGenerator';

export const AbstractBook: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Abstract Book Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate, customize, and manage abstract books for the conference. 
            Create professional documents in multiple formats including HTML, PDF, and DOCX.
          </Typography>
        </Box>
        
        <AbstractBookGenerator />
      </Paper>
    </Container>
  );
};