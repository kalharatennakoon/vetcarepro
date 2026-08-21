import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CustomerAuthProvider } from './context/CustomerAuthContext'
import { NotificationProvider } from './context/NotificationContext'
import NotificationToast from './components/NotificationToast'
import AppointmentReminder from './components/AppointmentReminder'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CustomerAuthProvider>
        <NotificationProvider>
          <App />
          <AppointmentReminder />
          <NotificationToast />
        </NotificationProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)