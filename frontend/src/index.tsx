import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './responsive.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA support
// Change to register() to enable PWA features in production
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('✅ Service worker registered successfully');
  },
  onUpdate: (registration) => {
    console.log('🔄 New version available! Refresh to update.');
  },
});