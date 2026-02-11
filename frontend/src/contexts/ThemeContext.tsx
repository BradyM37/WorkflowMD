import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { theme } from 'antd';
import type { ThemeConfig } from 'antd';

const { darkAlgorithm, defaultAlgorithm } = theme;

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  themeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('darkMode');
    // Check system preference if no saved preference
    if (savedMode === null) {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return savedMode === 'true';
  });

  useEffect(() => {
    localStorage.setItem('darkMode', String(isDarkMode));
    // Update body class for global styles
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.body.style.backgroundColor = '#141414';
    } else {
      document.body.classList.remove('dark-mode');
      document.body.style.backgroundColor = '#f0f2f5';
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const themeConfig: ThemeConfig = {
    algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
    token: {
      colorPrimary: '#667eea',
      borderRadius: 8,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    },
    components: {
      Layout: {
        headerBg: isDarkMode ? '#141414' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        bodyBg: isDarkMode ? '#1f1f1f' : '#f0f2f5',
      },
      Card: {
        colorBgContainer: isDarkMode ? '#262626' : '#ffffff',
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
};
