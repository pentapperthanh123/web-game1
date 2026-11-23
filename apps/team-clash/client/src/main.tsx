import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useClashStore } from './store/clashStore';

declare global {
  interface Window {
    __clashStore?: typeof useClashStore;
  }
}

if (typeof window !== 'undefined') {
  window.__clashStore = useClashStore;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

