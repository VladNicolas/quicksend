/**
 * Application entry point
 * Renders the root App component wrapped with necessary providers
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'

// Create root element and render the application
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Wrap app with authentication provider to enable auth features throughout the app */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
