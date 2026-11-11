import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Mount React application
createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker after initial paint to avoid blocking FCP/LCP
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.warn('SW registration failed:', err));
  }
});
