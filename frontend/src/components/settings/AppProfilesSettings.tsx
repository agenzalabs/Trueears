import React, { useState, useEffect } from 'react';
import { AppProfile } from '../../types/appProfile';
import { AppProfileService } from '../../services/appProfileService';

export const AppProfilesSettings: React.FC = () => {
  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AppProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const loadedProfiles = AppProfileService.getProfiles();
    setProfiles(loadedProfiles);
    if (loadedProfiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(loadedProfiles[0].id);
      setEditForm({ ...loadedProfiles[0] });
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
      <div className="w-80 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-medium text-gray-300">Profiles</h3>
          <p className="text-xs text-gray-500 mt-1">Manage app-specific prompts</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleSelectProfile(profile)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 flex items-center gap-2 ${
                selectedProfileId === profile.id
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${profile.enabled ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              <span className="truncate">{profile.displayName}</span>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={handleAddNew}
            className="w-full bg-white/5 border border-white/10 text-xs text-gray-300 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            + Add New Profile
          </button>
          <button
            onClick={handleReset}
            className="w-full text-xs text-gray-500 py-1.5 rounded-lg hover:text-gray-300 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Right: Edit Form */}
      <div className="flex-1 p-8 overflow-y-auto">
        {editForm ? (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">
              {selectedProfileId && profiles.find(p => p.id === selectedProfileId) ? 'Edit Profile' : 'New Profile'}
            </h2>

            <div className="space-y-6">
              {/* Display Name */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Display Name</label>
                <input
                  type="text"
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  placeholder="e.g., VS Code"
                />
              </div>

              {/* App Executable */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">App Executable</label>
                <input
                  type="text"
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-colors"
                  value={editForm.appName}
                  onChange={(e) => setEditForm({ ...editForm, appName: e.target.value })}
                  placeholder="e.g., Code.exe, slack.exe"
                />
                <p className="text-xs text-gray-600">Case-insensitive. Will match partial names.</p>
              </div>

              {/* System Prompt */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">System Prompt</label>
                <textarea
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors resize-none"
                  rows={10}
                  value={editForm.systemPrompt}
                  onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                  placeholder="Instructions for how the LLM should format transcriptions for this app..."
                />
              </div>

              {/* Enabled Toggle */}
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={editForm.enabled}
                  onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-white"
                />
                <span className="text-sm text-gray-300">Enable this profile</span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    saved
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  {saved ? '✓ Saved!' : 'Save Profile'}
                </button>
                {selectedProfileId && profiles.find(p => p.id === selectedProfileId) && (
                  <button
                    onClick={handleDelete}
                    className="px-6 bg-rose-500/20 text-rose-400 text-sm font-medium py-3 rounded-lg hover:bg-rose-500/30 transition-colors border border-rose-500/30"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Select a profile or create a new one
          </div>
        )}
      </div>
    </div>
  );
};
