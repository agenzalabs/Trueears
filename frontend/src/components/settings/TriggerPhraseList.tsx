/**
 * TriggerPhraseList - Settings component for managing Log Mode trigger phrases.
 *
 * Allows users to:
 * - View all trigger phrases
 * - Enable/disable individual phrases
 * - Add new phrases
 * - Edit existing phrases
 * - Delete phrases
 *
 * @feature 004-context-log
 */

import React, { useState } from 'react';
import { TriggerPhrase, MAX_TRIGGER_PHRASE_LENGTH } from '../../types/logMode';

interface TriggerPhraseListProps {
  phrases: TriggerPhrase[];
  onAdd: (phrase: string) => void;
  onUpdate: (id: string, updates: Partial<TriggerPhrase>) => void;
  onDelete: (id: string) => void;
  isDark: boolean;
}

export const TriggerPhraseList: React.FC<TriggerPhraseListProps> = ({
  phrases,
  onAdd,
  onUpdate,
  onDelete,
  isDark,
}) => {
  const [newPhrase, setNewPhrase] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = newPhrase.trim();
    setError(null);

    if (!trimmed) {
      setError('Please enter a phrase');
      return;
    }

    if (trimmed.length > MAX_TRIGGER_PHRASE_LENGTH) {
      setError(`Phrase must be ${MAX_TRIGGER_PHRASE_LENGTH} characters or less`);
      return;
    }

    // Check for duplicates
    const exists = phrases.some(p => p.phrase.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setError('This phrase already exists');
      return;
    }

    onAdd(trimmed);
    setNewPhrase('');
  };

  const handleStartEdit = (phrase: TriggerPhrase) => {
    setEditingId(phrase.id);
    setEditValue(phrase.phrase);
    setError(null);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editValue.trim();
    setError(null);

    if (!trimmed) {
      setError('Phrase cannot be empty');
      return;
    }

    if (trimmed.length > MAX_TRIGGER_PHRASE_LENGTH) {
      setError(`Phrase must be ${MAX_TRIGGER_PHRASE_LENGTH} characters or less`);
      return;
    }

    // Check for duplicates (excluding current)
    const exists = phrases.some(p => p.id !== id && p.phrase.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setError('This phrase already exists');
      return;
    }

    onUpdate(id, { phrase: trimmed });
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
    setError(null);
  };

  const handleToggleEnabled = (id: string, currentEnabled: boolean) => {
    onUpdate(id, { enabled: !currentEnabled });
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
      {/* Add New Phrase */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newPhrase}
          onChange={(e) => {
            setNewPhrase(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => handleKeyDown(e, handleAdd)}
          placeholder="Add new trigger phrase..."
          maxLength={MAX_TRIGGER_PHRASE_LENGTH}
          className={`
            flex-1 px-3 py-2 text-sm rounded-lg
            outline-none transition-colors
            ${isDark
              ? 'bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:border-gray-500'
              : 'bg-white text-gray-800 placeholder-gray-400 border border-gray-300 focus:border-gray-500'
            }
          `}
        />
        <button
          onClick={handleAdd}
          disabled={!newPhrase.trim()}
          className={`
            px-4 py-2 text-sm font-medium rounded-lg transition-colors
            ${isDark
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-gray-700 disabled:text-gray-500'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-gray-200 disabled:text-gray-400'
            }
          `}
        >
          Add
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-rose-500">
          {error}
        </div>
      )}

      {/* Phrase List */}
      <div className={`rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        {phrases.length === 0 ? (
          <div className={`p-4 text-sm text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            No trigger phrases configured
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {phrases.map((phrase) => (
              <li
                key={phrase.id}
                className={`
                  flex items-center gap-3 px-4 py-3
                  ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}
                `}
              >
                {/* Enable/Disable Toggle */}
                <button
                  onClick={() => handleToggleEnabled(phrase.id, phrase.enabled)}
                  className={`
                    w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                    transition-colors
                    ${phrase.enabled
                      ? 'bg-emerald-500 text-white'
                      : isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
                    }
                  `}
                  title={phrase.enabled ? 'Disable' : 'Enable'}
                >
                  {phrase.enabled && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Phrase Text / Edit Input */}
                {editingId === phrase.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, () => handleSaveEdit(phrase.id))}
                    maxLength={MAX_TRIGGER_PHRASE_LENGTH}
                    autoFocus
                    className={`
                      flex-1 px-2 py-1 text-sm rounded
                      outline-none transition-colors
                      ${isDark
                        ? 'bg-gray-700 text-white border border-gray-600 focus:border-gray-500'
                        : 'bg-gray-100 text-gray-800 border border-gray-300 focus:border-gray-500'
                      }
                    `}
                  />
                ) : (
                  <span
                    className={`
                      flex-1 text-sm
                      ${phrase.enabled
                        ? isDark ? 'text-gray-200' : 'text-gray-800'
                        : isDark ? 'text-gray-500 line-through' : 'text-gray-400 line-through'
                      }
                    `}
                  >
                    "{phrase.phrase}"
                  </span>
                )}

                {/* Actions */}
                {editingId === phrase.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSaveEdit(phrase.id)}
                      className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-emerald-400' : 'hover:bg-gray-200 text-emerald-600'}`}
                      title="Save"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                      title="Cancel"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : deleteConfirmId === phrase.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleConfirmDelete(phrase.id)}
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
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartEdit(phrase)}
                      className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(phrase.id)}
                      className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-rose-400' : 'hover:bg-gray-200 text-rose-500'}`}
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Help Text */}
      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Trigger phrases activate Log Mode when spoken at the start of your dictation.
        The phrase will be stripped from the logged content.
      </p>
    </div>
  );
};
