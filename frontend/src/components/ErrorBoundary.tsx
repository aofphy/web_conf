import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    // Example: Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // This is where you would integrate with error reporting services
    // For now, we'll just log to console
    console.error('Production error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre>{this.state.error?.message}</pre>
                <pre>{this.state.error?.stack}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
            
            <div className="error-actions">
              <button onClick={this.handleRetry} className="retry-button">
                Try Again
              </button>
              <button onClick={() => window.location.reload()} className="refresh-button">
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Styled error boundary component
export const StyledErrorBoundary: React.FC<Props> = ({ children, ...props }) => {
  return (
    <ErrorBoundary
      {...props}
      fallback={
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          margin: '1rem',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '500px',
          }}>
            <h2 style={{
              color: '#dc3545',
              marginBottom: '1rem',
              fontSize: '1.5rem',
            }}>
              Oops! Something went wrong
            </h2>
            <p style={{
              color: '#6c757d',
              marginBottom: '2rem',
              lineHeight: '1.5',
            }}>
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

// Hook for handling async errors in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    
    // Log error
    console.error('Async error:', error);
    
    // In production, report to error service
    if (process.env.NODE_ENV === 'production') {
      // Report error to service
      console.error('Production async error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Throw error to be caught by error boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, clearError };
}

// Form error display component
interface FormErrorProps {
  errors: Array<{ field: string; message: string; code: string }>;
  className?: string;
}

export const FormErrors: React.FC<FormErrorProps> = ({ errors, className = '' }) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div className={`form-errors ${className}`} style={{
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      padding: '0.75rem',
      marginBottom: '1rem',
      color: '#721c24',
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
        Please correct the following errors:
      </h4>
      <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
        {errors.map((error, index) => (
          <li key={index} style={{ marginBottom: '0.25rem' }}>
            <strong>{error.field}:</strong> {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Field error display component
interface FieldErrorProps {
  error?: string | null;
  touched?: boolean;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ 
  error, 
  touched = true, 
  className = '' 
}) => {
  if (!error || !touched) {
    return null;
  }

  return (
    <div className={`field-error ${className}`} style={{
      color: '#dc3545',
      fontSize: '0.875rem',
      marginTop: '0.25rem',
    }}>
      {error}
    </div>
  );
};

// Success message component
interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  hideDelay?: number;
  className?: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  onDismiss,
  autoHide = true,
  hideDelay = 5000,
  className = ''
}) => {
  React.useEffect(() => {
    if (autoHide && onDismiss) {
      const timer = setTimeout(onDismiss, hideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, onDismiss]);

  return (
    <div className={`success-message ${className}`} style={{
      backgroundColor: '#d4edda',
      border: '1px solid #c3e6cb',
      borderRadius: '4px',
      padding: '0.75rem',
      marginBottom: '1rem',
      color: '#155724',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#155724',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0',
            marginLeft: '1rem',
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
};

// Loading state component
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  className = ''
}) => {
  const sizeMap = {
    small: '1rem',
    medium: '2rem',
    large: '3rem',
  };

  return (
    <div className={`loading-spinner ${className}`} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          border: '2px solid #f3f3f3',
          borderTop: '2px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      {message && (
        <p style={{
          marginTop: '1rem',
          color: '#6c757d',
          textAlign: 'center',
        }}>
          {message}
        </p>
      )}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default ErrorBoundary;