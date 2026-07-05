import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  // StrictMode removed temporarily for debugging Pusher WebSocket issue
  // StrictMode causes double-invoke of useEffect which corrupts WebSocket connection
  <App />
);