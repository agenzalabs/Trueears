/**
 * AppMappingList - Settings component for managing app-to-file mappings.
 *
 * Allows users to:
 * - View all app mappings (App Name | File Path)
 * - Edit file paths for existing mappings
 * - Delete mappings
 *
 * @feature 004-context-log
 */

import React, { useState } from 'react';
import { AppLogMapping, hasAllowedExtension, ALLOWED_LOG_EXTENSIONS } from '../../types/logMode';
import { logModeService } from '../../services/logModeService';

interface AppMappingListProps {
  mappings: AppLogMapping[];
  onUpdate: (id: string, updates: Partial<AppLogMapping>) => void;
  onDelete: (id: string) => void;
  isDark: boolean;
}

export const AppMappingList: React.FC<AppMappingListProps> = ({
  mappings,
  onUpdate,
  onDelete,
  isDark,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPath, setEditPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleStartEdit = (mapping: AppLogMapping) => {
    setEditingId(mapping.id);
    setEditPath(mapping.logFilePath);
    setError(null);
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editPath.trim();
    setError(null);

    if (!trimmed) {
      setError('Path cannot be empty');
      return;
    }

    // Check extension
    if (!hasAllowedExtension(trimmed)) {
      setError(`File must end with ${ALLOWED_LOG_EXTENSIONS.join(', ')}`);
      return;
    }

    // Validate path
    setIsValidating(true);
    try {
      const validation = await logModeService.validatePath(trimmed);

      if (!validation.valid) {
        setError(validation.errorMessage || 'Invalid path');
        setIsValidating(false);
        return;
      }

      onUpdate(id, { logFilePath: trimmed });
      setEditingId(null);
      setEditPath('');
    } catch (err) {
      setError('Failed to validate path');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPath('');
    setError(null);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleOpenLog = async (filePath: string) => {
    try {
      await logModeService.openLogFile(filePath);
    } catch (err) {
      console.error('Failed to open log file:', err);
      // Could show a toast here if we had a toast system
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Mapping Table */}
      <div className={`rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        {mappings.length === 0 ? (
          <div className={`p-4 text-sm text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            No app mappings configured. Mappings are created automatically when you use Log Mode in a new app.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left text-xs ${isDark ? 'text-gray-400 bg-gray-800/50' : 'text-gray-500 bg-gray-50'}`}>
                  <th className="px-4 py-2 font-medium">App</th>
                  <th className="px-4 py-2 font-medium">Log File</th>
                  <th className="px-4 py-2 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {mappings.map((mapping) => (
                  <tr
                    key={mapping.id}
                    className={isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}
                  >
                    {/* App Name */}
                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {mapping.appDisplayName}
                    </td>

                    {/* File Path */}
                    <td className="px-4 py-3">
                      {editingId === mapping.id ? (
                        <input
                          type="text"
                          value={editPath}
                          onChange={(e) => setEditPath(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, () => handleSaveEdit(mapping.id))}
                          autoFocus
                          disabled={isValidating}
                          className={`
                            w-full px-2 py-1 text-sm rounded
                            outline-none transition-colors
                            ${isDark
                              ? 'bg-gray-700 text-white border border-gray-600 focus:border-gray-500'
                              : 'bg-gray-100 text-gray-800 border border-gray-300 focus:border-gray-500'
                            }
                          `}
                        />
                      ) : (
                        <span
                          className={`text-sm font-mono truncate block max-w-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                          title={mapping.logFilePath}
                        >
                          {mapping.logFilePath}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {deleteConfirmId === mapping.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleConfirmDelete(mapping.id)}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-rose-400' : 'hover:bg-gray-200 text-rose-500'}`}
                            title="Confirm delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelDelete}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : editingId === mapping.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveEdit(mapping.id)}
                            disabled={isValidating}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-emerald-400' : 'hover:bg-gray-200 text-emerald-600'}`}
                            title="Save"
                          >
                            {isValidating ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isValidating}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenLog(mapping.logFilePath)}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                            title="Open Log File"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleStartEdit(mapping)}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(mapping.id)}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-rose-400' : 'hover:bg-gray-200 text-rose-500'}`}
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-rose-500">
          {error}
        </div>
      )}

      {/* Help Text */}
      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        App mappings determine where Log Mode saves entries for each application.
        Edit the file path or delete mappings you no longer need.
      </p>
    </div>
  );
};
