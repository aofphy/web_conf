import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Alert,
  AlertTitle,
  Divider,
} from '@mui/material';
import { Refresh, Home, BugReport } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class MaterialErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true,
      error 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service in production
    if (import.meta.env.PROD) {
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleRefresh = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box textAlign="center" mb={3}>
              <BugReport color="error" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h4" color="error" gutterBottom>
                Oops! Something went wrong
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We're sorry, but something unexpected happened. Our team has been notified.
              </Typography>
            </Box>

            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>Error Details</AlertTitle>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Alert>

            {!import.meta.env.PROD && this.state.error && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Debug Information (Development Only)
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'grey.50',
                    maxHeight: 200,
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }}
                >
                  <pre>{this.state.error.stack}</pre>
                </Paper>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleRefresh}
                color="primary"
              >
                Refresh Page
              </Button>
              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={this.handleGoHome}
                color="primary"
              >
                Go to Home
              </Button>
            </Box>

            <Box mt={3} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                If this problem persists, please contact our support team.
              </Typography>
            </Box>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}