import type { StorageAdapter, PersistedState, WalletType } from './types.js';

const STORAGE_KEY = 'rivet:wallet';

/**
 * Default localStorage adapter for persisting wallet connections.
 */
export const localStorageAdapter: StorageAdapter = {
  get(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors (quota exceeded, private mode, etc.)
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

/**
 * In-memory storage adapter (for SSR or testing).
 */
export function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => store.set(key, value),
    remove: (key) => store.delete(key),
  };
}

/**
 * Load persisted wallet state from storage.
 */
export function loadPersistedState(storage: StorageAdapter): PersistedState | null {
  const raw = storage.get(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.connections) {
      return parsed as PersistedState;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save wallet connection state to storage.
 */
export function savePersistedState(storage: StorageAdapter, state: PersistedState): void {
  storage.set(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Add a chain connection to persisted state.
 */
export function addPersistedConnection(
  storage: StorageAdapter,
  chainId: string,
  walletType: WalletType
): void {
  const current = loadPersistedState(storage) ?? { connections: {} };
  current.connections[chainId] = { walletType };
  savePersistedState(storage, current);
}

/**
 * Remove a chain connection from persisted state.
 */
export function removePersistedConnection(storage: StorageAdapter, chainId: string): void {
  const current = loadPersistedState(storage);
  if (!current) return;
  delete current.connections[chainId];
  savePersistedState(storage, current);
}

/**
 * Clear all persisted connections.
 */
export function clearPersistedState(storage: StorageAdapter): void {
  storage.remove(STORAGE_KEY);
}
