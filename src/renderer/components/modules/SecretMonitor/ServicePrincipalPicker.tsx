import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/common';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store';
import { searchApplications, searchServicePrincipals } from '@/services/graph-api';
import clsx from 'clsx';

interface ServicePrincipalItem {
  id: string;
  appId: string;
  displayName: string;
  type: 'Application' | 'ServicePrincipal';
}

interface ServicePrincipalPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (items: ServicePrincipalItem[]) => void;
  initialSelection?: ServicePrincipalItem[];
}

export function ServicePrincipalPicker({
  isOpen,
  onClose,
  onSelect,
  initialSelection = [],
}: ServicePrincipalPickerProps) {
  const { config } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ServicePrincipalItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ServicePrincipalItem[]>(initialSelection);
  const [searchType, setSearchType] = useState<'applications' | 'servicePrincipals'>('applications');

  // Reset selection when modal opens with initial selection
  useEffect(() => {
    if (isOpen) {
      setSelectedItems(initialSelection);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, initialSelection]);

  // Search function
  const handleSearch = useCallback(async () => {
    if (!config || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let results: ServicePrincipalItem[] = [];

      if (searchType === 'applications') {
        const apps = await searchApplications(config, searchQuery);
        results = apps.map((app) => ({
          id: app.id,
          appId: app.appId,
          displayName: app.displayName,
          type: 'Application' as const,
        }));
      } else {
        const sps = await searchServicePrincipals(config, searchQuery);
        results = sps.map((sp) => ({
          id: sp.id,
          appId: sp.appId,
          displayName: sp.displayName,
          type: 'ServicePrincipal' as const,
        }));
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [config, searchQuery, searchType]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchType, handleSearch]);

  const toggleSelection = (item: ServicePrincipalItem) => {
    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.appId === item.appId);
      if (exists) {
        return prev.filter((i) => i.appId !== item.appId);
      }
      return [...prev, item];
    });
  };

  const isSelected = (appId: string) => selectedItems.some((i) => i.appId === appId);

  const handleConfirm = () => {
    onSelect(selectedItems);
    onClose();
  };

  const handleSelectAll = () => {
    const newItems = searchResults.filter((r) => !isSelected(r.appId));
    setSelectedItems((prev) => [...prev, ...newItems]);
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  const removeSelected = (appId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.appId !== appId));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Service Principals" size="lg">
      <div className="space-y-4">
        {/* Search Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSearchType('applications')}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors',
              searchType === 'applications'
                ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
            )}
          >
            Applications
          </button>
          <button
            onClick={() => setSearchType('servicePrincipals')}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors',
              searchType === 'servicePrincipals'
                ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
            )}
          >
            Service Principals
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or app ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
            autoFocus
          />
        </div>

        {/* Selected Items */}
        {selectedItems.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Selected ({selectedItems.length})
              </span>
              <button
                onClick={handleClearSelection}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedItems.slice(0, 10).map((item) => (
                <span
                  key={item.appId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 rounded text-sm border border-blue-200 dark:border-blue-700"
                >
                  <span className="truncate max-w-[150px]">{item.displayName}</span>
                  <button
                    onClick={() => removeSelected(item.appId)}
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedItems.length > 10 && (
                <span className="px-2 py-1 text-sm text-blue-600 dark:text-blue-400">
                  +{selectedItems.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">
              <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="sticky top-0 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {searchResults.length} results
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Select All
                </button>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {searchResults.map((result) => {
                  const selected = isSelected(result.appId);
                  return (
                    <button
                      key={result.appId}
                      onClick={() => toggleSelection(result)}
                      className={clsx(
                        'w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                        selected && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                    >
                      <div
                        className={clsx(
                          'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                          selected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        )}
                      >
                        {selected && <CheckIcon className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.displayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                          {result.appId}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {result.type === 'Application' ? 'App' : 'SP'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : searchQuery.length >= 2 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No results found
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Type at least 2 characters to search
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedItems.length === 0}
            className="btn-primary"
          >
            Select {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ServicePrincipalPicker;
