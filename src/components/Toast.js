import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '400px'
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              backgroundColor: 
                toast.type === 'success' ? '#c6f6d5' :
                toast.type === 'error' ? '#fed7d7' :
                toast.type === 'warning' ? '#fefcbf' :
                '#e2e8f0',
              color: 
                toast.type === 'success' ? '#2f855a' :
                toast.type === 'error' ? '#c53030' :
                toast.type === 'warning' ? '#744210' :
                '#2d3748',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '14px',
              fontWeight: '500',
              animation: 'slideIn 0.3s ease-out',
              border: `2px solid ${
                toast.type === 'success' ? '#48bb78' :
                toast.type === 'error' ? '#f56565' :
                toast.type === 'warning' ? '#d69e2e' :
                '#cbd5e0'
              }`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span style={{ fontSize: '18px' }}>
                {toast.type === 'success' ? '✓' :
                 toast.type === 'error' ? '✗' :
                 toast.type === 'warning' ? '⚠️' :
                 'ℹ️'}
              </span>
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0 0 0 10px',
                opacity: 0.7,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </ToastContext.Provider>
  );
};
