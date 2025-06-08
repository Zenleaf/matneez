import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Get the root element
const container = document.getElementById('root');

if (container) {
  // Create a root
  const root = createRoot(container);
  
  // Render the app
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  
  // Remove the loading class from the body when the app is mounted
  const loadingElement = document.querySelector('.app-loading');
  if (loadingElement) {
    loadingElement.classList.add('fade-out');
    // Remove the loading element after the fade out animation
    setTimeout(() => {
      if (loadingElement.parentNode) {
        loadingElement.parentNode.removeChild(loadingElement);
      }
    }, 300);
  }
}
