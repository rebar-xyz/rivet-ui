import { describe, it, expect } from 'vitest';
import {
  createMemoryStorage,
  loadPersistedState,
  savePersistedState,
  addPersistedConnection,
  removePersistedConnection,
  clearPersistedState,
} from '../src/storage.js';

describe('storage', () => {
  it('round-trips persisted state through save and load', () => {
    const storage = createMemoryStorage();
    const state = { connections: { 'cosmoshub-4': { walletType: 'keplr' as const } } };

    savePersistedState(storage, state);
    const loaded = loadPersistedState(storage);

    expect(loaded).toEqual(state);
  });

  it('returns null for empty, invalid JSON, and missing connections field', () => {
    const storage = createMemoryStorage();

    expect(loadPersistedState(storage)).toBeNull();

    storage.set('rivet:wallet', 'not json');
    expect(loadPersistedState(storage)).toBeNull();

    storage.set('rivet:wallet', JSON.stringify({ noConnections: true }));
    expect(loadPersistedState(storage)).toBeNull();

    storage.set('rivet:wallet', JSON.stringify(null));
    expect(loadPersistedState(storage)).toBeNull();
  });

  it('adds and removes connections incrementally', () => {
    const storage = createMemoryStorage();

    addPersistedConnection(storage, 'cosmoshub-4', 'keplr');
    addPersistedConnection(storage, 'osmosis-1', 'leap');

    expect(loadPersistedState(storage)).toEqual({
      connections: {
        'cosmoshub-4': { walletType: 'keplr' },
        'osmosis-1': { walletType: 'leap' },
      },
    });

    removePersistedConnection(storage, 'cosmoshub-4');
    expect(loadPersistedState(storage)?.connections).toEqual({
      'osmosis-1': { walletType: 'leap' },
    });
  });

  it('removePersistedConnection is a no-op on empty storage', () => {
    const storage = createMemoryStorage();
    removePersistedConnection(storage, 'cosmoshub-4');
    expect(loadPersistedState(storage)).toBeNull();
  });

  it('clearPersistedState wipes all connections', () => {
    const storage = createMemoryStorage();
    addPersistedConnection(storage, 'cosmoshub-4', 'keplr');
    clearPersistedState(storage);
    expect(loadPersistedState(storage)).toBeNull();
  });
});
