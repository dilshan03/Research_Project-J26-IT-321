import { useEffect, useState, useCallback } from 'react';
import {
  type CompanionConfig,
  DEFAULT_COMPANION_CONFIG,
} from './companionTypes';

const STORAGE_KEY = 'mathquest_companion_config_v1';
const EVENT_NAME = 'mathquest_companion_updated';

function loadStoredConfig(): CompanionConfig {
  if (typeof window === 'undefined') return DEFAULT_COMPANION_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COMPANION_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_COMPANION_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_COMPANION_CONFIG;
  }
}

function saveConfig(config: CompanionConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: config }));
  } catch (err) {
    console.error('Failed to save companion config:', err);
  }
}

export function useCompanion() {
  const [companion, setCompanion] = useState<CompanionConfig>(loadStoredConfig);

  useEffect(() => {
    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CompanionConfig>;
      if (customEvent.detail) {
        setCompanion(customEvent.detail);
      } else {
        setCompanion(loadStoredConfig());
      }
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setCompanion(loadStoredConfig());
      }
    };

    window.addEventListener(EVENT_NAME, handleCustomUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const updateCompanion = useCallback((partial: Partial<CompanionConfig>) => {
    setCompanion((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  const resetCompanion = useCallback(() => {
    setCompanion(DEFAULT_COMPANION_CONFIG);
    saveConfig(DEFAULT_COMPANION_CONFIG);
  }, []);

  return {
    companion,
    updateCompanion,
    resetCompanion,
  };
}
