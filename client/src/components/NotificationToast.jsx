import { useNotification } from '../context/NotificationContext';

const config = {
  success: { icon: 'fa-circle-check', bg: '#f0fdf4', border: '#16a34a', color: '#15803d', text: '#166534' },
  error:   { icon: 'fa-circle-xmark', bg: '#fef2f2', border: '#ef4444', color: '#dc2626', text: '#991b1b' },
  warning: { icon: 'fa-triangle-exclamation', bg: '#fffbeb', border: '#f59e0b', color: '#d97706', text: '#92400e' },
  info:    { icon: 'fa-circle-info', bg: '#eff6ff', border: '#3b82f6', color: '#2563eb', text: '#1e40af' }
};

const NotificationToast = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: '100%'
    }}>
      {notifications.map(({ id, type, message }) => {
        const c = config[type] || config.info;
        return (
          <div key={id} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 16px',
            backgroundColor: c.bg,
            border: `1px solid ${c.border}`,
            borderLeft: `4px solid ${c.border}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: 'slideIn 0.2s ease'
          }}>
            <i className={`fas ${c.icon}`} style={{ color: c.color, fontSize: '16px', marginTop: '1px', flexShrink: 0 }}></i>
            <span style={{ flex: 1, fontSize: '14px', color: c.text, lineHeight: '1.5' }}>{message}</span>
            <button
              onClick={() => removeNotification(id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: c.color, fontSize: '14px', flexShrink: 0 }}
            >
              <i className="fas fa-xmark"></i>
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationToast;
