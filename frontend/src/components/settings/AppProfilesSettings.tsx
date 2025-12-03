import React, { useState, useEffect } from 'react';
import { AppProfile } from '../../types/appProfile';
import { AppProfileService } from '../../services/appProfileService';

interface AppProfilesSettingsProps {
  theme: 'light' | 'dark';
}

export const AppProfilesSettings: React.FC<AppProfilesSettingsProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AppProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const loadedProfiles = AppProfileService.getProfiles();
    // Hide internal tutorial profiles from the UI
    const visibleProfiles = loadedProfiles.filter(p => !p.id.startsWith('tutorial-'));
    
    setProfiles(visibleProfiles);
    if (visibleProfiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(visibleProfiles[0].id);
      setEditForm({ ...visibleProfiles[0] });
    }
  };

  const handleSelectProfile = (profile: AppProfile) => {
    setSelectedProfileId(profile.id);
    setEditForm({ ...profile });
    setSaved(false);
  };

  const handleSave = () => {
    if (!editForm) return;
    
    if (selectedProfileId && profiles.find(p => p.id === selectedProfileId)) {
      AppProfileService.updateProfile(selectedProfileId, editForm);
    } else {
      AppProfileService.addProfile(editForm);
    }
    loadProfiles();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    if (!selectedProfileId) return;
    if (confirm('Delete this profile?')) {
      AppProfileService.deleteProfile(selectedProfileId);
      setSelectedProfileId(null);
      setEditForm(null);
      loadProfiles();
    }
  };

  const handleAddNew = () => {
    const newProfile: AppProfile = {
      id: `custom-${Date.now()}`,
      appName: '',
      displayName: 'New App',
      systemPrompt: '',
      enabled: true,
    };
    setSelectedProfileId(null);
    setEditForm(newProfile);
    setSaved(false);
  };

  const handleReset = () => {
    if (confirm('Reset to default profiles? This will delete all custom profiles.')) {
      AppProfileService.resetToDefaults();
      setSelectedProfileId(null);
      setEditForm(null);
      loadProfiles();
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Profile List */}
      <div className={`w-80 border-r flex flex-col ${isDark ? 'border-[#333]' : 'border-gray-300'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-[#333]' : 'border-gray-300'}`}>
          <h3 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Profiles</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Manage app-specific prompts</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleSelectProfile(profile)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 flex items-center gap-2 cursor-pointer ${
                selectedProfileId === profile.id
                  ? isDark ? 'bg-[#252525] text-gray-100 font-medium' : 'bg-gray-100 text-gray-800 font-medium'
                  : isDark ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${profile.enabled ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              <span className="truncate">{profile.displayName}</span>
            </button>
          ))}
        </div>

        <div className={`p-3 border-t space-y-2 ${isDark ? 'border-[#333]' : 'border-gray-300'}`}>
          <button
            onClick={handleAddNew}
            className={`w-full border text-xs py-2 rounded-lg transition-colors cursor-pointer ${isDark ? 'bg-[#1a1a1a]/50 border-[#333] text-gray-400 hover:bg-[#1a1a1a]' : 'bg-white/5 border-gray-300 text-gray-600 hover:bg-white/10'}`}
          >
            + Add New Profile
          </button>
          <button
            onClick={handleReset}
            className={`w-full text-xs py-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Right: Edit Form */}
      <div className="flex-1 p-8 overflow-y-auto">
        {editForm ? (
          <div className="max-w-2xl">
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {selectedProfileId && profiles.find(p => p.id === selectedProfileId) ? 'Edit Profile' : 'New Profile'}
            </h2>

            <div className="space-y-6">
              {/* Display Name */}
              <div className="flex flex-col gap-2">
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Display Name</label>
                <input
                  type="text"
                  className={`border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors ${isDark ? 'bg-[#1a1a1a] border-[#333] text-gray-200 focus:border-[#444]' : 'bg-white/5 border-gray-300 text-gray-800 focus:border-gray-400'}`}
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  placeholder="e.g., VS Code"
                />
              </div>

              {/* App Executable */}
              <div className="flex flex-col gap-2">
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>App Executable</label>
                <input
                  type="text"
                  className={`border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none transition-colors ${isDark ? 'bg-[#1a1a1a] border-[#333] text-gray-200 focus:border-[#444]' : 'bg-white/5 border-gray-300 text-gray-800 focus:border-gray-400'}`}
                  value={editForm.appName}
                  onChange={(e) => setEditForm({ ...editForm, appName: e.target.value })}
                  placeholder="e.g., Code.exe, slack.exe"
                />
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Case-insensitive. Will match partial names. Multiple profiles can share the same app name for different window titles.</p>
              </div>

              {/* Window Title Pattern */}
              <div className="flex flex-col gap-2">
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Window Title Pattern (Optional)</label>
                <input
                  type="text"
                  className={`border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none transition-colors ${isDark ? 'bg-[#1a1a1a] border-[#333] text-gray-200 focus:border-[#444]' : 'bg-white/5 border-gray-300 text-gray-800 focus:border-gray-400'}`}
                  value={editForm.windowTitlePattern || ''}
                  onChange={(e) => setEditForm({ ...editForm, windowTitlePattern: e.target.value || undefined })}
                  placeholder="e.g., WhatsApp, Gmail (regex supported)"
                />
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Optional regex pattern to match window title for specific tabs/windows. Case-insensitive.</p>
              </div>

              {/* System Prompt */}
              <div className="flex flex-col gap-2">
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>System Prompt</label>
                <textarea
                  className={`border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors resize-none ${isDark ? 'bg-[#1a1a1a] border-[#333] text-gray-200 focus:border-[#444]' : 'bg-white/5 border-gray-300 text-gray-800 focus:border-gray-400'}`}
                  rows={10}
                  value={editForm.systemPrompt}
                  onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                  placeholder="Instructions for how the LLM should format transcriptions for this app..."
                />
              </div>

              {/* Enabled Toggle */}
              <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-colors ${isDark ? 'bg-[#1a1a1a]/50 border-[#333] hover:bg-[#1a1a1a]' : 'bg-white/5 border-gray-300 hover:bg-white/10'}`}>
                <input
                  type="checkbox"
                  checked={editForm.enabled}
                  onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-500"
                />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Enable this profile</span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors cursor-pointer border ${
                    saved
                      ? 'bg-emerald-500 text-gray-800 border-emerald-600'
                      : isDark ? 'bg-[#1a1a1a] text-gray-200 hover:bg-[#252525] border-[#333] hover:border-[#444]' : 'bg-white text-black hover:bg-gray-200 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {saved ? '✓ Saved!' : 'Save Profile'}
                </button>
                {selectedProfileId && profiles.find(p => p.id === selectedProfileId) && (
                  <button
                    onClick={handleDelete}
                    className="px-6 bg-rose-500/20 text-rose-400 text-sm font-medium py-3 rounded-lg hover:bg-rose-500/30 transition-colors border border-rose-500/30 cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-center h-full text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Select a profile or create a new one
          </div>
        )}
      </div>
    </div>
  );
};
