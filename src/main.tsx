import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Swap the print-media Google Fonts link to "all" once loaded (replaces the
// inline onload="" handler removed from index.html for CSP script-src 'unsafe-inline' removal)
const gfontsLink = document.getElementById('gfonts-link') as HTMLLinkElement | null;
if (gfontsLink) gfontsLink.media = 'all';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
