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
}

export const LLMSettings: React.FC<LLMSettingsProps> = ({
  llmEnabled,
  llmModel,
  defaultSystemPrompt,
  saveLlmEnabled,
  saveLlmModel,
  saveDefaultSystemPrompt,
}) => {
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
        <h2 className="text-2xl font-bold mb-2">LLM Post-Processing</h2>
        <p className="text-gray-400 text-sm">
          Use an LLM to format and improve transcriptions. Uses your Groq API key automatically.
        </p>
      </div>

      <div className="space-y-6">
        {/* Enable Toggle */}
        <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 rounded accent-white"
          />
          <div>
            <div className="text-sm font-medium">Enable LLM Post-Processing</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Automatically format transcriptions using AI before pasting
            </div>
          </div>
        </label>

        {enabled && (
          <>
            {/* LLM Model */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">LLM Model</label>
              <CustomSelect value={model} options={LLM_MODELS} onChange={setModel} />
              <p className="text-xs text-gray-600">
                Recommended: <span className="font-mono">openai/gpt-oss-120b</span> for best performance
              </p>
            </div>

            {/* Default System Prompt */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Default System Prompt</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors resize-none"
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={DEFAULT_SYSTEM_PROMPT}
              />
              <p className="text-xs text-gray-600">
                This prompt is used when no app-specific profile matches. You can customize prompts per-app in the <strong>App Profiles</strong> tab.
              </p>
            </div>
          </>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save LLM Settings'}
        </button>
      </div>
    </div>
  );
};
