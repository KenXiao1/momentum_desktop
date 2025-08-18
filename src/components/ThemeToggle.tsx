import React, { useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { AccessibilityAnnouncer } from './AccessibilityAnnouncer';
import { useThemeAnnouncer } from '../hooks/useThemeAnnouncer';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'button' | 'dropdown';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  variant = 'button'
}) => {
  const { theme, isDark, setTheme, toggleTheme } = useDarkMode();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { announcement, announceThemeChange, clearAnnouncement } = useThemeAnnouncer();

  const themes = [
    { value: 'light' as const, label: '浅色模式', icon: Sun, description: '始终使用浅色主题' },
    { value: 'dark' as const, label: '深色模式', icon: Moon, description: '始终使用深色主题' },
    { value: 'system' as const, label: '跟随系统', icon: Monitor, description: '跟随系统设置' },
  ];

  const currentTheme = themes.find(t => t.value === theme);
  const CurrentIcon = currentTheme?.icon || Monitor;

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    announceThemeChange(newTheme);
    if (variant === 'dropdown') {
      setIsDropdownOpen(false);
    }
  };

  const handleToggle = () => {
    toggleTheme();
    announceThemeChange(isDark ? 'light' : 'dark');
  };

  if (variant === 'dropdown') {
    return (
      <>
        <div className={`relative ${className}`}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200/60 dark:border-slate-600/60 hover:bg-white dark:hover:bg-slate-700/90 transition-all duration-300 shadow-lg hover:shadow-xl dark:shadow-slate-900/50 focus-ring"
          aria-label="选择主题"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          <CurrentIcon size={18} className="text-gray-700 dark:text-slate-300" />
          {showLabel && (
            <span className="text-sm font-medium text-gray-800 dark:text-slate-200 font-chinese">
              {currentTheme?.label}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-600 dark:text-slate-400 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
            />
            
            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 dark:bg-slate-800/95 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-slate-600/60 backdrop-blur-xl z-20 animate-scale-in">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider font-chinese">
                  主题设置
                </div>
                {themes.map((themeOption) => {
                  const Icon = themeOption.icon;
                  const isSelected = theme === themeOption.value;
                  
                  return (
                    <button
                      key={themeOption.value}
                      onClick={() => {
                        handleThemeChange(themeOption.value);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                          : 'text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/50'
                      } focus-ring`}
                      role="menuitem"
                    >
                      <Icon size={18} />
                      <div className="flex-1 text-left">
                        <div className="font-medium font-chinese">{themeOption.label}</div>
                        <div className="text-xs text-gray-600 dark:text-slate-400">
                          {themeOption.description}
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={16} className="text-primary-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
        </div>
        <AccessibilityAnnouncer 
          message={announcement} 
          onAnnounced={clearAnnouncement}
        />
      </>
    );
  }

  // Simple toggle button variant
  return (
    <>
      <button
        onClick={handleToggle}
        className={`p-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md group focus-ring ${className}`}
        aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
        title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      >
        <div className="relative w-5 h-5">
          <Sun
            size={20}
            className={`absolute inset-0 text-yellow-500 transition-all duration-300 ${
              isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
            }`}
          />
          <Moon
            size={20}
            className={`absolute inset-0 text-blue-400 transition-all duration-300 ${
              isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
            }`}
          />
        </div>
        {showLabel && (
          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200 font-chinese">
            {isDark ? '浅色' : '深色'}
          </span>
        )}
      </button>
      <AccessibilityAnnouncer 
        message={announcement} 
        onAnnounced={clearAnnouncement}
      />
    </>
  );
};