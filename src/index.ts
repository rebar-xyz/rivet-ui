// @rebarxyz/rivet-ui
// React wallet management layer for Cosmos chains
// Extends @rebarxyz/rivet with multi-chain state, persistence, and modal UI

// Provider
export { RivetProvider, useRivetContext, useRivetContextRequired } from './context.js';
export type { RivetProviderProps } from './context.js';

// Hooks
export { useWallet } from './hooks/use-wallet.js';
export { useConnect } from './hooks/use-connect.js';
export { useDisconnect } from './hooks/use-disconnect.js';
export { useWallets } from './hooks/use-wallets.js';
export { useRivet } from './hooks/use-rivet.js';
export { useInstalledWallets } from './hooks/use-installed.js';
export { useWalletModal } from './hooks/use-modal.js';
export { useBlocks } from './hooks/use-blocks.js';
export { useTxEvents } from './hooks/use-tx-events.js';
export { useSubscription } from './hooks/use-subscription.js';

// Connector utilities
export {
  connectWallet,
  suggestChain,
  getWalletExtension,
  isWalletInstalled,
  getInstalledWallets,
  onAccountChange,
  silentReconnect,
  WalletNotInstalledError,
  WalletConnectionError,
} from './connector.js';
export type { ConnectResult } from './connector.js';

// Chain registry helpers
export { fromChainRegistry, toSuggestChainConfig } from './chain-registry.js';
export type { ChainRegistryChain, ChainRegistryAssetList } from './chain-registry.js';

// Storage adapters
export { localStorageAdapter, createMemoryStorage } from './storage.js';

// Types
export type {
  WalletType,
  ConnectionStatus,
  WalletState,
  WalletConnections,
  UseWalletReturn,
  UseConnectReturn,
  UseDisconnectReturn,
  UseWalletsReturn,
  UseRivetOptions,
  UseRivetReturn,
  UseInstalledWalletsReturn,
  UseWalletModalReturn,
  UseBlocksOptions,
  UseBlocksReturn,
  UseTxEventsOptions,
  UseTxEventsReturn,
  UseSubscriptionOptions,
  ChainConfig,
  Currency,
  FeeCurrency,
  RivetConfig,
  RivetContextValue,
  StorageAdapter,
  PersistedState,
  CosmosWalletExtension,
  OfflineDirectSigner,
  AccountData,
  NewBlockEvent,
  TxEvent,
  SubscriptionEvent,
} from './types.js';
