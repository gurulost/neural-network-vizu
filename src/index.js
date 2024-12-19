import React from 'react';
import ReactDOM from 'react-dom/client'; // React 18 uses this module
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import CssBaseline from '@mui/material/CssBaseline';

// Create the root element
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the app
root.render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);

// Measure performance (optional)
reportWebVitals();
