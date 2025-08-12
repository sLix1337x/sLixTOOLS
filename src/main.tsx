import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root');
  if (root) {
    // Clear any loading indicators
    root.innerHTML = '';
    
    // Mount React app
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    if (process.env.NODE_ENV === 'development') {
    console.log('React app mounted successfully!');
  }
} else {
  if (process.env.NODE_ENV === 'development') {
    console.error('Could not find root element to mount React app!');
  }
  }
});
