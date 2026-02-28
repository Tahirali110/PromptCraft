import React from 'react';
import { View, Text, Platform } from 'react-native';

interface Props {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const webTargetOrigins = ['http://localhost:3000', 'https://promptcraft.app'];

function sendErrorToIframeParent(error: any, errorInfo?: any) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Only send errors that have a stack property
    if (!error?.stack) {
      return;
    }

    console.debug('Sending error to parent:', {
      error,
      errorInfo,
      referrer: document.referrer,
    });

    const errorMessage = {
      type: 'ERROR_CAPTURED',
      error: {
        message: error?.message || error?.toString() || 'Unknown error',
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        source: 'error-boundary',
      },
      timestamp: Date.now(),
    };

    try {
      window.parent.postMessage(
        errorMessage,
        webTargetOrigins.includes(document.referrer) ? document.referrer : '*'
      );
    } catch (postMessageError) {
      console.error('Failed to send error to parent:', postMessageError);
    }
  }
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      event.preventDefault();
      const errorDetails = event.error ?? {
        message: event.message ?? 'Unknown error',
        filename: event.filename ?? 'Unknown file',
        lineno: event.lineno ?? 'Unknown line',
        colno: event.colno ?? 'Unknown column',
      };
      sendErrorToIframeParent(errorDetails);
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      event.preventDefault();
      sendErrorToIframeParent(event.reason);
    },
    true
  );

  const originalConsoleError = console.error;
  console.error = (...args) => {
    sendErrorToIframeParent(args.join(' '));
    originalConsoleError.apply(console, args);
  };
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    sendErrorToIframeParent(error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View id="promptcraft-error-boundary" className="flex-1 bg-white">
          <View className="flex-1 items-center justify-center p-5">
            <Text className="mb-2 text-center text-4xl font-bold">Something went wrong</Text>
            <Text className="mb-3 text-center text-sm text-gray-600">
              {this.state.error?.message}
            </Text>
            {Platform.OS !== 'web' && (
              <Text className="mt-2 text-center text-sm text-gray-600">
                Please check your device logs for more details.
              </Text>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
