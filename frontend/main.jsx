import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // This points to your renamed JobFinder.jsx (now App.jsx)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);