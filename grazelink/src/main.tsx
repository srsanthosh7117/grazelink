import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import './index.css';

// When deployed at a sub-path (GitHub Pages serves this under /grazelink/) the
// router has to mount there too, or it matches no route and every page renders
// blank — with no console error, because nothing actually failed.
//
// Derived from Vite's BASE_URL, which is set by the same --base flag that
// rewrites the asset URLs, so the two cannot drift apart. Previously this read
// a separate VITE_ROUTER_BASENAME that had to be remembered alongside --base;
// setting only --base produced a site whose assets loaded perfectly and whose
// every page was empty. VITE_ROUTER_BASENAME still wins if explicitly set.
const BASENAME = import.meta.env.VITE_ROUTER_BASENAME || import.meta.env.BASE_URL || '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={BASENAME}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
