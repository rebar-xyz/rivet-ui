import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  RivetConfig,
  RivetContextValue,
  WalletConnections,
  WalletState,
  WalletType,
  ChainConfig,
} from './types.js';
import { connectWallet, silentReconnect, onAccountChange } from './connector.js';
import {
  localStorageAdapter,
  loadPersistedState,
  addPersistedConnection,
  removePersistedConnection,
  clearPersistedState,
} from './storage.js';

const initialWalletState: WalletState = {
  status: 'disconnected',
  walletType: null,
  address: null,
  account: null,
  signer: null,
  error: null,
};

const RivetContext = createContext<RivetContextValue | null>(null);

export interface RivetProviderProps {
  config?: RivetConfig;
  children: ReactNode;
}

/**
 * Provider for Rivet wallet state management.
 *
 * Provides multi-chain wallet connection state, auto-reconnect,
 * persistence, and event handling.
 *
 * @example
 * ```tsx
 * <RivetProvider config={{
 *   autoReconnect: true,
 *   defaultWallet: 'keplr',
 *   chains: [{ chainId: 'rebar-1', chainName: 'Rebar', rpc: 'https://rpc.rebar.xyz' }],
 * }}>
 *   <App />
 * </RivetProvider>
 * ```
 */
export function RivetProvider({ config = {}, children }: RivetProviderProps) {
  const storage = config.storage ?? localStorageAdapter;

  const normalizedConfig = useMemo(
    () => ({
      ...config,
      autoReconnect: config.autoReconnect ?? true,
      defaultWallet: config.defaultWallet ?? 'keplr' as WalletType,
    }),
    [config]
  );

  const [connections, setConnections] = useState<WalletConnections>({});
  const [modalState, setModalState] = useState<{ isOpen: boolean; chainId: string | null }>({
    isOpen: false,
    chainId: null,
  });

  const getChainConfig = useCallback(
    (chainId: string): ChainConfig | undefined => {
      return normalizedConfig.chains?.find((c) => c.chainId === chainId);
    },
    [normalizedConfig.chains]
  );

  const updateConnection = useCallback((chainId: string, update: Partial<WalletState>) => {
    setConnections((prev) => ({
      ...prev,
      [chainId]: {
        ...(prev[chainId] ?? initialWalletState),
        ...update,
      },
    }));
  }, []);

  const connect = useCallback(
    async (chainId: string, walletType: WalletType): Promise<WalletState> => {
      updateConnection(chainId, {
        status: 'connecting',
        walletType,
        error: null,
      });

      try {
        const chainConfig = getChainConfig(chainId);
        const result = await connectWallet(chainId, walletType, chainConfig);
        const newState: WalletState = {
          status: 'connected',
          walletType,
          address: result.address,
          account: result.account,
          signer: result.signer,
          error: null,
        };

        updateConnection(chainId, newState);
        addPersistedConnection(storage, chainId, walletType);

        return newState;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const errorState: WalletState = {
          ...initialWalletState,
          status: 'error',
          walletType,
          error,
        };

        updateConnection(chainId, errorState);
        return errorState;
      }
    },
    [getChainConfig, storage, updateConnection]
  );

  const disconnect = useCallback(
    (chainId: string) => {
      setConnections((prev) => {
        const next = { ...prev };
        delete next[chainId];
        return next;
      });
      removePersistedConnection(storage, chainId);
    },
    [storage]
  );

  const disconnectAll = useCallback(() => {
    setConnections({});
    clearPersistedState(storage);
  }, [storage]);

  const openModal = useCallback((chainId?: string) => {
    setModalState({ isOpen: true, chainId: chainId ?? null });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, chainId: null });
  }, []);

  // Auto-reconnect on mount
  useEffect(() => {
    if (!normalizedConfig.autoReconnect) return;

    const persisted = loadPersistedState(storage);
    if (!persisted) return;

    Object.entries(persisted.connections).forEach(async ([chainId, { walletType }]) => {
      updateConnection(chainId, {
        status: 'reconnecting',
        walletType,
      });

      const result = await silentReconnect(chainId, walletType);

      if (result) {
        updateConnection(chainId, {
          status: 'connected',
          walletType,
          address: result.address,
          account: result.account,
          signer: result.signer,
          error: null,
        });
      } else {
        // Silent reconnect failed - remove from persistence
        setConnections((prev) => {
          const next = { ...prev };
          delete next[chainId];
          return next;
        });
        removePersistedConnection(storage, chainId);
      }
    });
  }, [normalizedConfig.autoReconnect, storage, updateConnection]);

  // Handle wallet account changes
  useEffect(() => {
    return onAccountChange(async () => {
      // Re-fetch account info for all connected chains
      const connectedChains = Object.entries(connections).filter(
        ([, state]) => state.status === 'connected' && state.walletType
      );

      for (const [chainId, state] of connectedChains) {
        if (!state.walletType) continue;

        updateConnection(chainId, { status: 'reconnecting' });

        const result = await silentReconnect(chainId, state.walletType);

        if (result) {
          const newAccount = result.account;
          const oldAccount = state.account;

          // Notify if account changed
          if (normalizedConfig.onAccountChange && oldAccount?.address !== newAccount.address) {
            normalizedConfig.onAccountChange(chainId, newAccount);
          }

          updateConnection(chainId, {
            status: 'connected',
            address: result.address,
            account: result.account,
            signer: result.signer,
            error: null,
          });
        } else {
          // Connection lost
          if (normalizedConfig.onAccountChange) {
            normalizedConfig.onAccountChange(chainId, null);
          }

          setConnections((prev) => {
            const next = { ...prev };
            delete next[chainId];
            return next;
          });
          removePersistedConnection(storage, chainId);
        }
      }
    });
  }, [connections, normalizedConfig, storage, updateConnection]);

  const value = useMemo<RivetContextValue>(
    () => ({
      connections,
      config: normalizedConfig,
      connect,
      disconnect,
      disconnectAll,
      getChainConfig,
      modalState,
      openModal,
      closeModal,
    }),
    [connections, normalizedConfig, connect, disconnect, disconnectAll, getChainConfig, modalState, openModal, closeModal]
  );

  return <RivetContext.Provider value={value}>{children}</RivetContext.Provider>;
}

/**
 * Access the Rivet context.
 * Returns null if used outside of RivetProvider.
 */
export function useRivetContext(): RivetContextValue | null {
  return useContext(RivetContext);
}

/**
 * Access the Rivet context (throws if not in provider).
 */
export function useRivetContextRequired(): RivetContextValue {
  const context = useContext(RivetContext);
  if (!context) {
    throw new Error('useRivetContextRequired must be used within RivetProvider');
  }
  return context;
}
