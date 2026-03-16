import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

let idCounter = 0;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, message, duration = 4000) => {
    const id = ++idCounter;
    setNotifications(prev => [...prev, { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
    // duration = 0 means persistent — only dismissed by user clicking ×
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{
      showSuccess: (msg, duration) => addNotification('success', msg, duration),
      showError: (msg, duration) => addNotification('error', msg, duration),
      showInfo: (msg, duration) => addNotification('info', msg, duration),
      showWarning: (msg, duration) => addNotification('warning', msg, duration),
      notifications,
      removeNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
