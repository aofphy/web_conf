import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

interface PageLoaderProps {
  message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = 'Loading page...' 
}) => {
  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {message}
      </Typography>
      <LinearProgress />
    </Box>
  );
};