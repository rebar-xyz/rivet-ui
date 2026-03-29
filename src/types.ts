import type { OfflineDirectSigner, AccountData } from '@rebarxyz/rivet';
import type { Rivet, NewBlockEvent, TxEvent, SubscriptionEvent } from '@rebarxyz/rivet';

// Re-export for convenience
export type { OfflineDirectSigner, AccountData, NewBlockEvent, TxEvent, SubscriptionEvent };

// ============================================================================
// Core Wallet Types
// ============================================================================

export type WalletType = 'keplr' | 'leap' | 'cosmostation';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface WalletState {
  status: ConnectionStatus;
  walletType: WalletType | null;
  address: string | null;
  account: AccountData | null;
  signer: OfflineDirectSigner | null;
  error: Error | null;
}

export interface WalletActions {
  connect: (walletType?: WalletType) => Promise<void>;
  disconnect: () => void;
}

export interface UseWalletReturn extends WalletState, WalletActions {
  isConnected: boolean;
  isDisconnected: boolean;
  isConnecting: boolean;
}

// ============================================================================
// Multi-Chain State
// ============================================================================

export type WalletConnections = Record<string, WalletState>;

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ChainConfig {
  chainId: string;
  chainName: string;
  rpc: string;
  rest?: string;
  bip44?: { coinType: number };
  bech32Prefix?: string;
  currencies?: Currency[];
  feeCurrencies?: FeeCurrency[];
  stakeCurrency?: Currency;
}

export interface Currency {
  coinDenom: string;
  coinMinimalDenom: string;
  coinDecimals: number;
  coinGeckoId?: string;
}

export interface FeeCurrency extends Currency {
  gasPriceStep?: {
    low: number;
    average: number;
    high: number;
  };
}

export interface RivetConfig {
  chains?: ChainConfig[];
  defaultWallet?: WalletType;
  autoReconnect?: boolean;
  storage?: StorageAdapter;
  onAccountChange?: (chainId: string, account: AccountData | null) => void;
}

// ============================================================================
// Storage
// ============================================================================

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface PersistedState {
  connections: Record<string, { walletType: WalletType }>;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseConnectReturn {
  connect: (args: { chainId: string | string[]; walletType?: WalletType }) => void;
  connectAsync: (args: { chainId: string | string[]; walletType?: WalletType }) => Promise<WalletState>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  status: 'idle' | 'pending' | 'success' | 'error';
  error: Error | null;
  reset: () => void;
}

export interface UseDisconnectReturn {
  disconnect: (chainId?: string | string[]) => void;
  disconnectAll: () => void;
}

export interface UseWalletsReturn {
  connections: WalletConnections;
  getConnection: (chainId: string) => WalletState;
  isConnected: (chainId: string) => boolean;
  connectedChains: string[];
  hasAnyConnection: boolean;
}

export interface UseRivetOptions {
  rpcUrl: string;
  /** Chain ID whose connected wallet to attach for signing. Omit for read-only. */
  withWallet?: string;
  gasConfig?: {
    multiplier?: number;
    gasPrice?: string;
  };
}

export interface UseRivetReturn {
  client: Rivet | null;
  isReady: boolean;
  /** True when a wallet signer is attached and signing is possible. */
  canSign: boolean;
  error: Error | null;
}

// ============================================================================
// Subscription Hook Types
// ============================================================================

export interface UseBlocksOptions {
  enabled?: boolean;
}

export interface UseBlocksReturn {
  latestBlock: NewBlockEvent | null;
  isSubscribed: boolean;
  error: Error | null;
}

export interface UseTxEventsOptions {
  bufferSize?: number;
  enabled?: boolean;
}

export interface UseTxEventsReturn {
  latestTx: TxEvent | null;
  events: TxEvent[];
  isSubscribed: boolean;
  error: Error | null;
  clear: () => void;
}

export interface UseSubscriptionOptions {
  enabled?: boolean;
}

export interface UseInstalledWalletsReturn {
  wallets: WalletType[];
  isInstalled: (type: WalletType) => boolean;
  isLoading: boolean;
}

export interface UseWalletModalReturn {
  isOpen: boolean;
  chainId: string | null;
  open: (chainId?: string) => void;
  close: () => void;
}

// ============================================================================
// Context Types
// ============================================================================

export interface RivetContextValue {
  connections: WalletConnections;
  config: Required<Pick<RivetConfig, 'autoReconnect' | 'defaultWallet'>> & Omit<RivetConfig, 'autoReconnect' | 'defaultWallet'>;
  connect: (chainId: string, walletType: WalletType) => Promise<WalletState>;
  disconnect: (chainId: string) => void;
  disconnectAll: () => void;
  getChainConfig: (chainId: string) => ChainConfig | undefined;
  // Modal state
  modalState: { isOpen: boolean; chainId: string | null };
  openModal: (chainId?: string) => void;
  closeModal: () => void;
}

// ============================================================================
// Wallet Extension Interface
// ============================================================================

/**
 * Minimal interface for Keplr/Leap/Cosmostation wallet extensions.
 * All three share this common API surface.
 */
export interface CosmosWalletExtension {
  enable(chainId: string): Promise<void>;
  getOfflineSigner(chainId: string): OfflineDirectSigner;
  getOfflineSignerAuto(chainId: string): Promise<OfflineDirectSigner>;
  getKey(chainId: string): Promise<{
    name: string;
    algo: string;
    pubKey: Uint8Array;
    address: Uint8Array;
    bech32Address: string;
    isNanoLedger: boolean;
  }>;
  experimentalSuggestChain?: (chainInfo: unknown) => Promise<void>;
}

declare global {
  interface Window {
    keplr?: CosmosWalletExtension;
    leap?: CosmosWalletExtension;
    cosmostation?: {
      providers?: {
        keplr?: CosmosWalletExtension;
      };
    };
  }
}
