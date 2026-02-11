import toast from 'react-hot-toast';

interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

/**
 * Professional notification system using react-hot-toast
 * Styled to match Linear/Notion quality
 */

export const notify = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      style: {
        background: '#52c41a',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#52c41a',
      },
    });
  },

  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      style: {
        background: '#ff4d4f',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(255, 77, 79, 0.3)',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#ff4d4f',
      },
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      icon: '⚠️',
      style: {
        background: '#faad14',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(250, 173, 20, 0.3)',
      },
    });
  },

  info: (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#1890ff',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
      },
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      style: {
        background: '#fff',
        color: '#262626',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(
      promise,
      messages,
      {
        style: {
          padding: '16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
        },
        success: {
          duration: 4000,
          icon: '✅',
        },
        error: {
          duration: 5000,
          icon: '❌',
        },
      }
    );
  },

  custom: (message: string, icon?: string, options?: ToastOptions) => {
    toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      icon: icon || '💡',
      style: {
        background: '#667eea',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
      },
    });
  },

  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },
};

// Keyboard shortcut notification helper
export const notifyShortcut = (action: string, keys: string) => {
  notify.custom(`${action}: ${keys}`, '⌨️', { duration: 2000 });
};
