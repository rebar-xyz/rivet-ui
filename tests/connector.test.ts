import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getWalletExtension,
  isWalletInstalled,
  getInstalledWallets,
  buildSuggestChainInfo,
  connectWallet,
  suggestChain,
  silentReconnect,
  WalletNotInstalledError,
  WalletConnectionError,
} from '../src/connector.js';
import type { CosmosWalletExtension, ChainConfig } from '../src/types.js';

function mockExtension(overrides?: Partial<CosmosWalletExtension>): CosmosWalletExtension {
  const mockSigner = {
    getAccounts: vi.fn().mockResolvedValue([
      { address: 'cosmos1abc', algo: 'secp256k1', pubkey: new Uint8Array(33) },
    ]),
    signDirect: vi.fn(),
  };

  return {
    enable: vi.fn().mockResolvedValue(undefined),
    getOfflineSigner: vi.fn().mockReturnValue(mockSigner),
    getOfflineSignerAuto: vi.fn().mockResolvedValue(mockSigner),
    getKey: vi.fn(),
    experimentalSuggestChain: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ============================================================================
// Wallet Detection
// ============================================================================

describe('wallet detection', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    // @ts-expect-error - minimal window mock
    globalThis.window = {};
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it('detects each wallet type from window', () => {
    const ext = mockExtension();
    window.keplr = ext;
    expect(getWalletExtension('keplr')).toBe(ext);
    expect(isWalletInstalled('keplr')).toBe(true);

    window.leap = ext;
    expect(getWalletExtension('leap')).toBe(ext);

    // Cosmostation uses nested provider path
    window.cosmostation = { providers: { keplr: ext } };
    expect(getWalletExtension('cosmostation')).toBe(ext);
  });

  it('returns null for missing wallets and unknown types', () => {
    expect(getWalletExtension('keplr')).toBeNull();
    expect(getWalletExtension('unknown' as any)).toBeNull();
    expect(isWalletInstalled('leap')).toBe(false);
  });

  it('getInstalledWallets returns only present wallets', () => {
    expect(getInstalledWallets()).toEqual([]);
    window.keplr = mockExtension();
    window.leap = mockExtension();
    expect(getInstalledWallets()).toEqual(['keplr', 'leap']);
  });
});

// ============================================================================
// buildSuggestChainInfo
// ============================================================================

describe('buildSuggestChainInfo', () => {
  it('builds complete chain info with defaults', () => {
    const config: ChainConfig = {
      chainId: 'test-1',
      chainName: 'Test Chain',
      rpc: 'https://rpc.test.com',
    };

    const info = buildSuggestChainInfo(config);

    expect(info.chainId).toBe('test-1');
    expect(info.rest).toBe('https://rpc.test.com'); // falls back to rpc
    expect(info.bip44).toEqual({ coinType: 118 }); // default
    expect(info.bech32Config.bech32PrefixAccAddr).toBe('cosmos'); // default prefix
    expect(info.bech32Config.bech32PrefixValAddr).toBe('cosmosvaloper');
    expect(info.stakeCurrency.coinDenom).toBe('ATOM'); // ultimate fallback
  });

  it('uses provided values over defaults', () => {
    const config: ChainConfig = {
      chainId: 'rebar-1',
      chainName: 'Rebar',
      rpc: 'https://rpc.rebar.xyz',
      rest: 'https://rest.rebar.xyz',
      bip44: { coinType: 330 },
      bech32Prefix: 'rebar',
      currencies: [{ coinDenom: 'REBAR', coinMinimalDenom: 'urebar', coinDecimals: 6 }],
    };

    const info = buildSuggestChainInfo(config);

    expect(info.rest).toBe('https://rest.rebar.xyz');
    expect(info.bip44).toEqual({ coinType: 330 });
    expect(info.bech32Config.bech32PrefixAccAddr).toBe('rebar');
    expect(info.stakeCurrency).toEqual(config.currencies![0]); // first currency as stake
  });
});

// ============================================================================
// connectWallet
// ============================================================================

describe('connectWallet', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    // @ts-expect-error - minimal window mock
    globalThis.window = {};
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it('throws WalletNotInstalledError when extension is missing', async () => {
    await expect(connectWallet('cosmoshub-4', 'keplr')).rejects.toThrow(WalletNotInstalledError);
  });

  it('connects and returns signer, account, address', async () => {
    const ext = mockExtension();
    window.keplr = ext;

    const result = await connectWallet('cosmoshub-4', 'keplr');

    expect(ext.enable).toHaveBeenCalledWith('cosmoshub-4');
    expect(result.address).toBe('cosmos1abc');
    expect(result.signer).toBeDefined();
    expect(result.account.algo).toBe('secp256k1');
  });

  it('suggests chain before connecting when config provided', async () => {
    const ext = mockExtension();
    window.keplr = ext;
    const config: ChainConfig = { chainId: 'rebar-1', chainName: 'Rebar', rpc: 'https://rpc.rebar.xyz' };

    await connectWallet('rebar-1', 'keplr', config);

    expect(ext.experimentalSuggestChain).toHaveBeenCalled();
    expect(ext.enable).toHaveBeenCalledWith('rebar-1');
  });

  it('falls back to getOfflineSigner when getOfflineSignerAuto throws', async () => {
    const ext = mockExtension({
      getOfflineSignerAuto: vi.fn().mockRejectedValue(new Error('not supported')),
    });
    window.keplr = ext;

    const result = await connectWallet('cosmoshub-4', 'keplr');

    expect(ext.getOfflineSigner).toHaveBeenCalledWith('cosmoshub-4');
    expect(result.address).toBe('cosmos1abc');
  });

  it('wraps unexpected errors in WalletConnectionError', async () => {
    const ext = mockExtension({
      enable: vi.fn().mockRejectedValue(new Error('user rejected')),
    });
    window.keplr = ext;

    const err = await connectWallet('cosmoshub-4', 'keplr').catch((e) => e);
    expect(err).toBeInstanceOf(WalletConnectionError);
    expect(err.walletType).toBe('keplr');
    expect(err.message).toContain('user rejected');
  });

  it('throws WalletConnectionError when wallet returns no accounts', async () => {
    const emptySigner = { getAccounts: vi.fn().mockResolvedValue([]), signDirect: vi.fn() };
    const ext = mockExtension({
      getOfflineSignerAuto: vi.fn().mockResolvedValue(emptySigner),
    });
    window.keplr = ext;

    const err = await connectWallet('cosmoshub-4', 'keplr').catch((e) => e);
    expect(err).toBeInstanceOf(WalletConnectionError);
    expect(err.message).toContain('No accounts');
  });
});

// ============================================================================
// suggestChain / silentReconnect
// ============================================================================

describe('suggestChain', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    // @ts-expect-error
    globalThis.window = {};
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it('throws WalletNotInstalledError when extension is missing', async () => {
    await expect(suggestChain('keplr', {} as any)).rejects.toThrow(WalletNotInstalledError);
  });
});

describe('silentReconnect', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    // @ts-expect-error
    globalThis.window = {};
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it('returns null on failure instead of throwing', async () => {
    const result = await silentReconnect('cosmoshub-4', 'keplr');
    expect(result).toBeNull();
  });

  it('returns ConnectResult on success', async () => {
    window.keplr = mockExtension();
    const result = await silentReconnect('cosmoshub-4', 'keplr');
    expect(result).not.toBeNull();
    expect(result!.address).toBe('cosmos1abc');
  });
});
