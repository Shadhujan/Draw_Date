import React from 'react';
import { createRoot } from 'react-dom/client';

class AppBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="boot-screen" role="alert">
      <strong>draw date</strong><p>Our pencils got a little tangled. Please reload to open your studio.</p>
      <a href="" style={{ color: 'var(--boot-ink)', padding: 12 }}>Reload the studio</a>
    </main>;
    return this.props.children;
  }
}

void import('./App').then(({ default: App }) => {
  createRoot(document.getElementById('root')!).render(<React.StrictMode><AppBoundary><App /></AppBoundary></React.StrictMode>);
}).catch(() => {
  (window as Window & { drawDateBootFailure?: () => void }).drawDateBootFailure?.();
});
