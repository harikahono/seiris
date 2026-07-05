import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/globals.css'

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
createRoot(rootEl).render(
  // StrictMode removed temporarily for debugging Pusher WebSocket issue
  // StrictMode causes double-invoke of useEffect which corrupts WebSocket connection
  <App />
);