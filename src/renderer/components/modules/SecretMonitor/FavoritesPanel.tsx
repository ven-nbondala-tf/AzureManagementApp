import { useState, useEffect } from 'react';
import {
  StarIcon,
  TrashIcon,
  PencilIcon,
  PlayIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export interface FavoriteItem {
  id: string;
  appId: string;
  displayName: string;
  type: 'Application' | 'ServicePrincipal';
}

export interface Favorite {
  id: string;
  name: string;
  items: FavoriteItem[];
  createdAt: string;
  updatedAt: string;
}

interface FavoritesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelection: FavoriteItem[];
  onLoadFavorite: (items: FavoriteItem[]) => void;
  onScanFavorite: (items: FavoriteItem[]) => void;
}

// Type-safe access to favorites API
interface FavoritesAPI {
  getAll: () => Promise<{ success: boolean; data?: Favorite[]; error?: string }>;
  save: (favorite: { id?: string; name: string; items: FavoriteItem[] }) => Promise<{ success: boolean; data?: Favorite[]; error?: string }>;
  delete: (id: string) => Promise<{ success: boolean; data?: Favorite[]; error?: string }>;
}

function getFavoritesAPI(): FavoritesAPI | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (window as any).electronAPI?.favorites;
  return api || null;
}

export function FavoritesPanel({
  isOpen,
  onClose,
  currentSelection,
  onLoadFavorite,
  onScanFavorite,
}: FavoritesPanelProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newFavoriteName, setNewFavoriteName] = useState('');
  const [showSaveNew, setShowSaveNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFavorites();
    }
  }, [isOpen]);

  const loadFavorites = async () => {
    const api = getFavoritesAPI();
    if (!api) return;

    setIsLoading(true);
    try {
      const result = await api.getAll();
      if (result.success && result.data) {
        setFavorites(result.data);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFavorite = async (name: string, items: FavoriteItem[], id?: string) => {
    const api = getFavoritesAPI();
    if (!api) return;

    try {
      const result = await api.save({ id, name, items });
      if (result.success && result.data) {
        setFavorites(result.data);
      }
    } catch (error) {
      console.error('Failed to save favorite:', error);
    }
  };

  const deleteFavorite = async (id: string) => {
    const api = getFavoritesAPI();
    if (!api) return;

    try {
      const result = await api.delete(id);
      if (result.success && result.data) {
        setFavorites(result.data);
      }
    } catch (error) {
      console.error('Failed to delete favorite:', error);
    }
  };

  const handleSaveCurrentSelection = async () => {
    if (!newFavoriteName.trim() || currentSelection.length === 0) return;
    await saveFavorite(newFavoriteName.trim(), currentSelection);
    setNewFavoriteName('');
    setShowSaveNew(false);
  };

  const handleUpdateName = async (id: string) => {
    if (!editName.trim()) return;
    const favorite = favorites.find((f) => f.id === id);
    if (favorite) {
      await saveFavorite(editName.trim(), favorite.items, id);
    }
    setEditingId(null);
    setEditName('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-80 h-full bg-white dark:bg-gray-800 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <StarIconSolid className="w-5 h-5 text-yellow-500" />
            Favorites
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Save Current Selection */}
        {currentSelection.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
            {showSaveNew ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Favorite name..."
                  value={newFavoriteName}
                  onChange={(e) => setNewFavoriteName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCurrentSelection}
                    disabled={!newFavoriteName.trim()}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveNew(false);
                      setNewFavoriteName('');
                    }}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveNew(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4" />
                Save Current Selection ({currentSelection.length})
              </button>
            )}
          </div>
        )}

        {/* Favorites List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : favorites.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <StarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No favorites saved yet</p>
              <p className="text-xs mt-1">
                Select service principals and save them as a favorite
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  {editingId === favorite.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateName(favorite.id)}
                          className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditName('');
                          }}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {favorite.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {favorite.items.length} item{favorite.items.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onScanFavorite(favorite.items)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                        >
                          <PlayIcon className="w-3 h-3" />
                          Scan
                        </button>
                        <button
                          onClick={() => onLoadFavorite(favorite.items)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(favorite.id);
                            setEditName(favorite.name);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteFavorite(favorite.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FavoritesPanel;
