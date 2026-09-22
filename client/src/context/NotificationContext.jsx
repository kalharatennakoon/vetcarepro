import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

let idCounter = 0;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => {
      const item = prev.find(n => n.id === id);
      if (!item || item.exiting) return prev;
      return prev.map(n => (n.id === id ? { ...n, exiting: true } : n));
    });
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 300);
  }, []);

  const addNotification = useCallback((type, message, duration = 4000) => {
    const isWelcomeOrSignout = /welcome back|signed out|sign out|logged out/i.test(message);
    const effectiveDuration = (duration === 4000 && isWelcomeOrSignout) ? 2000 : duration;
    const id = ++idCounter;
    setNotifications(prev => [...prev, { id, type, message, exiting: false }]);
    if (effectiveDuration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, effectiveDuration);
    }
    // duration = 0 means persistent — only dismissed by user clicking ×
  }, [removeNotification]);

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
