import { useState } from 'react';

/**
 * Hook for announcing theme changes
 */
export const useThemeAnnouncer = () => {
  const [announcement, setAnnouncement] = useState('');

  const announceThemeChange = (theme: 'light' | 'dark' | 'system') => {
    const messages = {
      light: '已切换到浅色模式',
      dark: '已切换到深色模式',
      system: '已切换到跟随系统模式',
    };
    
    setAnnouncement(messages[theme]);
  };

  const clearAnnouncement = () => {
    setAnnouncement('');
  };

  return {
    announcement,
    announceThemeChange,
    clearAnnouncement,
  };
};
