import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

let idCounter = 0;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, message, duration = 4000) => {
    const id = ++idCounter;
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{
      showSuccess: (msg) => addNotification('success', msg),
      showError: (msg) => addNotification('error', msg),
      showInfo: (msg) => addNotification('info', msg),
      showWarning: (msg) => addNotification('warning', msg),
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
