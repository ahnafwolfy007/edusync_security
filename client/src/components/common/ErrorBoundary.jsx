import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  componentDidMount() {
    this._onWindowError = (event) => {
      const err = event?.error || event?.message || 'Unknown error';
      this.setState({ hasError: true, error: err });
    };
    this._onUnhandledRejection = (event) => {
      const reason = event?.reason || 'Unhandled promise rejection';
      this.setState({ hasError: true, error: reason });
    };
    window.addEventListener('error', this._onWindowError);
    window.addEventListener('unhandledrejection', this._onUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this._onWindowError);
    window.removeEventListener('unhandledrejection', this._onUnhandledRejection);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h1 style={{ color: '#b91c1c' }}>Something went wrong.</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
