import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { getCurrentWindow } from '@tauri-apps/api/window';

const SettingsWindow = lazy(async () => ({
  default: (await import('./components/SettingsWindow')).SettingsWindow,
}));

const windowFallback = (
  <div style={{ width: '100vw', height: '100vh', backgroundColor: '#ffffff' }} />
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#1f2937', backgroundColor: '#f8fafc' }}>
          <h1>Something went wrong</h1>
          <pre style={{ color: '#ef4444' }}>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Determine which component to render based on window label
const renderApp = () => {
  try {
    const windowLabel = getCurrentWindow().label;
    console.log('[Index] Window label:', windowLabel);
    return windowLabel === 'settings' ? <SettingsWindow /> : <App />;
  } catch (error) {
    console.error('[Index] Error getting window label:', error);
    return <App />;
  }
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={windowFallback}>
        {renderApp()}
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);
