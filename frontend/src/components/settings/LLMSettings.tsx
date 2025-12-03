import React, { useState } from 'react';
import { CustomSelect } from '../CustomSelect';
import { LLM_MODELS } from '../../hooks/useSettings';
import { DEFAULT_SYSTEM_PROMPT } from '../../types/appProfile';

interface LLMSettingsProps {
  llmEnabled: boolean;
  llmModel: string;
  defaultSystemPrompt: string;
  saveLlmEnabled: (enabled: boolean) => void;
  saveLlmModel: (model: string) => void;
  saveDefaultSystemPrompt: (prompt: string) => void;
  theme: 'light' | 'dark';
}

export const LLMSettings: React.FC<LLMSettingsProps> = ({
  llmEnabled,
  llmModel,
  defaultSystemPrompt,
  saveLlmEnabled,
  saveLlmModel,
  saveDefaultSystemPrompt,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [enabled, setEnabled] = useState(llmEnabled);
  const [model, setModel] = useState(llmModel);
  const [prompt, setPrompt] = useState(defaultSystemPrompt);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveLlmEnabled(enabled);
    saveLlmModel(model);
    saveDefaultSystemPrompt(prompt);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>LLM Post-Processing</h2>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
          Use an LLM to format and improve transcriptions. Uses your Groq API key automatically.
        </p>
      </div>

      <div className="space-y-6">
        {/* Enable Toggle */}
        <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-lg border transition-colors ${isDark ? 'bg-[#1a1a1a]/50 border-[#333] hover:bg-[#1a1a1a]' : 'bg-white/5 border-gray-300 hover:bg-white/10'}`}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 rounded accent-emerald-500"
          />
          <div>
            <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : ''}`}>Enable LLM Post-Processing</div>
            <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Automatically format transcriptions using AI before pasting
            </div>
          </div>
        </label>

        {enabled && (
          <>
            {/* LLM Model */}
            <div className="flex flex-col gap-2">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>LLM Model</label>
              <CustomSelect value={model} options={LLM_MODELS} onChange={setModel} theme={theme} />
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Recommended: <span className="font-mono">openai/gpt-oss-120b</span> for best performance
              </p>
            </div>

            {/* Default System Prompt */}
            <div className="flex flex-col gap-2">
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Default System Prompt</label>
              <textarea
                className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors resize-none ${isDark ? 'bg-[#1a1a1a] border-[#333] text-gray-200 focus:border-[#444]' : 'bg-white/5 border-gray-300 text-gray-800 focus:border-gray-400'}`}
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={DEFAULT_SYSTEM_PROMPT}
              />
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                This prompt is used when no app-specific profile matches. You can customize prompts per-app in the <strong>App Profiles</strong> tab.
              </p>
            </div>
          </>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-lg font-medium transition-colors cursor-pointer border ${
            saved
              ? 'bg-emerald-500 text-gray-800 border-emerald-600'
              : isDark ? 'bg-[#1a1a1a] text-gray-200 hover:bg-[#252525] border-[#333] hover:border-[#444]' : 'bg-white text-black hover:bg-gray-200 border-gray-300 hover:border-gray-400'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save LLM Settings'}
        </button>
      </div>
    </div>
  );
};
