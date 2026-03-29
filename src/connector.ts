import type { OfflineDirectSigner, AccountData } from '@rebarxyz/rivet';
import type { WalletType, CosmosWalletExtension, ChainConfig } from './types.js';

export class WalletNotInstalledError extends Error {
  constructor(public walletType: WalletType) {
    super(`${walletType} wallet extension not installed`);
    this.name = 'WalletNotInstalledError';
  }
}

export class WalletConnectionError extends Error {
  constructor(
    public walletType: WalletType,
    public cause: unknown
  ) {
    super(`Failed to connect to ${walletType}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'WalletConnectionError';
  }
}

/**
 * Get the wallet extension from the window object.
 * Returns null if not installed.
 */
export function getWalletExtension(walletType: WalletType): CosmosWalletExtension | null {
  if (typeof window === 'undefined') return null;

  switch (walletType) {
    case 'keplr':
      return window.keplr ?? null;
    case 'leap':
      return window.leap ?? null;
    case 'cosmostation':
      // Cosmostation exposes a Keplr-compatible API
      return window.cosmostation?.providers?.keplr ?? null;
    default:
      return null;
  }
}

/**
 * Check if a wallet extension is installed.
 */
export function isWalletInstalled(walletType: WalletType): boolean {
  return getWalletExtension(walletType) !== null;
}

/**
 * Get list of installed wallet extensions.
 */
export function getInstalledWallets(): WalletType[] {
  const wallets: WalletType[] = [];
  if (isWalletInstalled('keplr')) wallets.push('keplr');
  if (isWalletInstalled('leap')) wallets.push('leap');
  if (isWalletInstalled('cosmostation')) wallets.push('cosmostation');
  return wallets;
}

export interface ConnectResult {
  signer: OfflineDirectSigner;
  account: AccountData;
  address: string;
}

/**
 * Build the chain info object needed by experimentalSuggestChain from a ChainConfig.
 */
export function buildSuggestChainInfo(config: ChainConfig) {
  const prefix = config.bech32Prefix ?? 'cosmos';
  return {
    chainId: config.chainId,
    chainName: config.chainName,
    rpc: config.rpc,
    rest: config.rest ?? config.rpc,
    bip44: config.bip44 ?? { coinType: 118 },
    bech32Config: {
      bech32PrefixAccAddr: prefix,
      bech32PrefixAccPub: prefix + 'pub',
      bech32PrefixValAddr: prefix + 'valoper',
      bech32PrefixValPub: prefix + 'valoperpub',
      bech32PrefixConsAddr: prefix + 'valcons',
      bech32PrefixConsPub: prefix + 'valconspub',
    },
    currencies: config.currencies ?? [],
    feeCurrencies: config.feeCurrencies ?? [],
    stakeCurrency: config.stakeCurrency ?? config.currencies?.[0] ?? {
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6,
    },
  };
}

/**
 * Connect to a wallet and return the signer.
 * This is the core connection function.
 *
 * If chainConfig is provided, suggests the chain to the wallet first
 * (needed for custom/unknown chains).
 */
export async function connectWallet(
  chainId: string,
  walletType: WalletType,
  chainConfig?: ChainConfig
): Promise<ConnectResult> {
  const extension = getWalletExtension(walletType);

  if (!extension) {
    throw new WalletNotInstalledError(walletType);
  }

  try {
    // Suggest chain to wallet if config provided (for custom/unknown chains)
    if (chainConfig && extension.experimentalSuggestChain) {
      await extension.experimentalSuggestChain(buildSuggestChainInfo(chainConfig));
    }

    // Enable the wallet for this chain (prompts user approval if needed)
    await extension.enable(chainId);

    // Get the offline signer - prefer getOfflineSignerAuto for Ledger compatibility
    // Fall back to getOfflineSigner if auto isn't available
    let signer: OfflineDirectSigner;
    try {
      signer = await extension.getOfflineSignerAuto(chainId);
    } catch {
      signer = extension.getOfflineSigner(chainId);
    }

    // Get accounts from the signer
    const accounts = await signer.getAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found in wallet');
    }

    const account = accounts[0] as AccountData;

    return {
      signer,
      account,
      address: account.address,
    };
  } catch (err) {
    if (err instanceof WalletNotInstalledError) throw err;
    throw new WalletConnectionError(walletType, err);
  }
}

/**
 * Suggest a chain to a wallet (adds chain config if not present).
 * Call this before connectWallet if the chain might not be in the wallet.
 */
export async function suggestChain(
  walletType: WalletType,
  chainInfo: {
    chainId: string;
    chainName: string;
    rpc: string;
    rest: string;
    bip44: { coinType: number };
    bech32Config: {
      bech32PrefixAccAddr: string;
      bech32PrefixAccPub: string;
      bech32PrefixValAddr: string;
      bech32PrefixValPub: string;
      bech32PrefixConsAddr: string;
      bech32PrefixConsPub: string;
    };
    currencies: Array<{
      coinDenom: string;
      coinMinimalDenom: string;
      coinDecimals: number;
    }>;
    feeCurrencies: Array<{
      coinDenom: string;
      coinMinimalDenom: string;
      coinDecimals: number;
      gasPriceStep?: { low: number; average: number; high: number };
    }>;
    stakeCurrency: {
      coinDenom: string;
      coinMinimalDenom: string;
      coinDecimals: number;
    };
  }
): Promise<void> {
  const extension = getWalletExtension(walletType);
  if (!extension) {
    throw new WalletNotInstalledError(walletType);
  }

  if (extension.experimentalSuggestChain) {
    await extension.experimentalSuggestChain(chainInfo);
  }
}

// ============================================================================
// Event Listeners
// ============================================================================

type AccountChangeCallback = (chainId?: string) => void;

const accountChangeListeners = new Set<AccountChangeCallback>();
let keystoreChangeSetup = false;

/**
 * Subscribe to wallet account change events.
 * Wallets emit this when the user switches accounts or chains.
 *
 * Returns an unsubscribe function.
 */
export function onAccountChange(callback: AccountChangeCallback): () => void {
  accountChangeListeners.add(callback);
  setupKeystoreChangeListener();
  return () => {
    accountChangeListeners.delete(callback);
  };
}

function setupKeystoreChangeListener(): void {
  if (keystoreChangeSetup || typeof window === 'undefined') return;
  keystoreChangeSetup = true;

  // Keplr emits 'keplr_keystorechange'
  window.addEventListener('keplr_keystorechange', () => {
    accountChangeListeners.forEach((cb) => cb());
  });

  // Leap emits 'leap_keystorechange'
  window.addEventListener('leap_keystorechange', () => {
    accountChangeListeners.forEach((cb) => cb());
  });

  // Cosmostation emits 'cosmostation_keystorechange'
  window.addEventListener('cosmostation_keystorechange', () => {
    accountChangeListeners.forEach((cb) => cb());
  });
}

/**
 * Attempt to silently reconnect to a wallet.
 * Used for auto-reconnect on page load.
 * Does not throw - returns null on failure.
 */
export async function silentReconnect(
  chainId: string,
  walletType: WalletType
): Promise<ConnectResult | null> {
  try {
    return await connectWallet(chainId, walletType);
  } catch {
    return null;
  }
}
