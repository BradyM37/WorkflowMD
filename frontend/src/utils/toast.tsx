import { message, notification } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

// Configure default settings
message.config({
  top: 24,
  duration: 4,
  maxCount: 3,
});

notification.config({
  placement: 'topRight',
  duration: 4.5,
  maxCount: 3,
});

/**
 * Toast notification system using Ant Design
 * Provides consistent success, error, warning, info, and loading messages
 */
export const toast = {
  /**
   * Show success message
   */
  success: (content: string, duration?: number) => {
    message.success({
      content,
      duration: duration || 4,
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    });
  },

  /**
   * Show error message
   */
  error: (content: string, duration?: number) => {
    message.error({
      content,
      duration: duration || 5,
      icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    });
  },

  /**
   * Show warning message
   */
  warning: (content: string, duration?: number) => {
    message.warning({
      content,
      duration: duration || 4,
      icon: <WarningOutlined style={{ color: '#faad14' }} />,
    });
  },

  /**
   * Show info message
   */
  info: (content: string, duration?: number) => {
    message.info({
      content,
      duration: duration || 4,
      icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
    });
  },

  /**
   * Show loading message
   * Returns a function to hide the loading message
   */
  loading: (content: string) => {
    return message.loading({
      content,
      duration: 0, // Don't auto-hide loading messages
      icon: <LoadingOutlined style={{ color: '#667eea' }} />,
    });
  },

  /**
   * Promise-based toast (shows loading, then success or error)
   */
  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ): Promise<T> => {
    const hide = message.loading({
      content: messages.loading,
      duration: 0,
      icon: <LoadingOutlined style={{ color: '#667eea' }} />,
    });

    try {
      const result = await promise;
      hide();
      const successMsg = typeof messages.success === 'function' 
        ? messages.success(result) 
        : messages.success;
      message.success({
        content: successMsg,
        duration: 4,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      });
      return result;
    } catch (error) {
      hide();
      const errorMsg = typeof messages.error === 'function' 
        ? messages.error(error) 
        : messages.error;
      message.error({
        content: errorMsg,
        duration: 5,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      });
      throw error;
    }
  },

  /**
   * Destroy all messages
   */
  destroy: () => {
    message.destroy();
  },
};

/**
 * Notification system for richer content (with title and description)
 */
export const notify = {
  /**
   * Show success notification
   */
  success: (message: string, description?: string) => {
    notification.success({
      message,
      description,
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    });
  },

  /**
   * Show error notification
   */
  error: (message: string, description?: string) => {
    notification.error({
      message,
      description,
      icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    });
  },

  /**
   * Show warning notification
   */
  warning: (message: string, description?: string) => {
    notification.warning({
      message,
      description,
      icon: <WarningOutlined style={{ color: '#faad14' }} />,
    });
  },

  /**
   * Show info notification
   */
  info: (message: string, description?: string) => {
    notification.info({
      message,
      description,
      icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
    });
  },

  /**
   * Destroy all notifications
   */
  destroy: () => {
    notification.destroy();
  },
};

// Export default as toast
export default toast;
