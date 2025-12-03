import React from 'react';

interface AppearanceSettingsProps {
  theme: 'light' | 'dark';
  saveTheme: (theme: 'light' | 'dark') => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  theme,
  saveTheme,
}) => {
  const isDark = theme === 'dark';
  
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Appearance</h2>
      
      <div className="space-y-6">
        <div>
          <label className={`text-sm font-medium mb-3 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Theme</label>
          <div className="flex gap-3">
            <button
              onClick={() => saveTheme('light')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                theme === 'light'
                  ? isDark ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50'
                  : isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                  </svg>
                </div>
                <span className={`text-sm font-medium ${theme === 'light' ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Light
                </span>
              </div>
            </button>

            <button
              onClick={() => saveTheme('dark')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                theme === 'dark'
                  ? isDark ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50'
                  : isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-lg bg-gray-900 border border-gray-700 shadow-sm flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className={`text-sm font-medium ${theme === 'dark' ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Dark
                </span>
              </div>
            </button>
          </div>
        </div>

        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Choose your preferred color scheme. This affects both the settings window and the recording overlay.
        </p>
      </div>
    </div>
  );
};
