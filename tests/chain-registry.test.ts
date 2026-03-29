import { describe, it, expect } from 'vitest';
import { fromChainRegistry, toSuggestChainConfig } from '../src/chain-registry.js';
import type { ChainRegistryChain, ChainRegistryAssetList } from '../src/chain-registry.js';

// ============================================================================
// fromChainRegistry
// ============================================================================

describe('fromChainRegistry', () => {
  const minimalChain: ChainRegistryChain = {
    chain_id: 'cosmoshub-4',
    chain_name: 'cosmoshub',
  };

  it('throws when no RPC endpoint is available', () => {
    expect(() => fromChainRegistry(minimalChain)).toThrow('No RPC endpoint');
  });

  it('uses rpcOverride when provided', () => {
    const config = fromChainRegistry(minimalChain, 'https://rpc.custom.com');
    expect(config.rpc).toBe('https://rpc.custom.com');
    expect(config.chainId).toBe('cosmoshub-4');
  });

  it('falls back to first RPC from chain apis', () => {
    const chain: ChainRegistryChain = {
      ...minimalChain,
      apis: { rpc: [{ address: 'https://rpc.cosmos.network' }] },
    };
    const config = fromChainRegistry(chain);
    expect(config.rpc).toBe('https://rpc.cosmos.network');
  });

  it('maps bech32_prefix, slip44, and rest endpoint', () => {
    const chain: ChainRegistryChain = {
      ...minimalChain,
      bech32_prefix: 'cosmos',
      slip44: 118,
      apis: {
        rpc: [{ address: 'https://rpc.cosmos.network' }],
        rest: [{ address: 'https://rest.cosmos.network' }],
      },
    };
    const config = fromChainRegistry(chain);

    expect(config.bech32Prefix).toBe('cosmos');
    expect(config.bip44).toEqual({ coinType: 118 });
    expect(config.rest).toBe('https://rest.cosmos.network');
  });

  it('builds currencies from asset list with correct decimals', () => {
    const assetList: ChainRegistryAssetList = {
      chain_name: 'cosmoshub',
      assets: [
        {
          denom_units: [
            { denom: 'uatom', exponent: 0 },
            { denom: 'atom', exponent: 6 },
          ],
          base: 'uatom',
          display: 'atom',
          symbol: 'ATOM',
          coingecko_id: 'cosmos',
        },
      ],
    };

    const config = fromChainRegistry(minimalChain, 'https://rpc.test.com', assetList);

    expect(config.currencies).toHaveLength(1);
    expect(config.currencies![0]).toEqual({
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6,
      coinGeckoId: 'cosmos',
    });
  });

  it('resolves staking currency and fee currencies with gas price steps', () => {
    const chain: ChainRegistryChain = {
      ...minimalChain,
      staking: { staking_tokens: [{ denom: 'uatom' }] },
      fees: {
        fee_tokens: [
          { denom: 'uatom', low_gas_price: 0.01, average_gas_price: 0.025, high_gas_price: 0.03 },
        ],
      },
    };

    const assetList: ChainRegistryAssetList = {
      chain_name: 'cosmoshub',
      assets: [
        {
          denom_units: [{ denom: 'uatom', exponent: 0 }, { denom: 'atom', exponent: 6 }],
          base: 'uatom',
          display: 'atom',
          symbol: 'ATOM',
        },
      ],
    };

    const config = fromChainRegistry(chain, 'https://rpc.test.com', assetList);

    expect(config.stakeCurrency?.coinDenom).toBe('ATOM');
    expect(config.feeCurrencies).toHaveLength(1);
    expect(config.feeCurrencies![0].gasPriceStep).toEqual({
      low: 0.01,
      average: 0.025,
      high: 0.03,
    });
  });

  it('skips fee tokens not found in asset list', () => {
    const chain: ChainRegistryChain = {
      ...minimalChain,
      fees: { fee_tokens: [{ denom: 'unknown', low_gas_price: 0.01 }] },
    };

    const assetList: ChainRegistryAssetList = {
      chain_name: 'cosmoshub',
      assets: [
        {
          denom_units: [{ denom: 'uatom', exponent: 0 }],
          base: 'uatom',
          display: 'uatom',
          symbol: 'ATOM',
        },
      ],
    };

    const config = fromChainRegistry(chain, 'https://rpc.test.com', assetList);
    expect(config.feeCurrencies).toEqual([]);
  });

  it('uses fixed_min_gas_price as fallback for missing gas price fields', () => {
    const chain: ChainRegistryChain = {
      ...minimalChain,
      fees: { fee_tokens: [{ denom: 'uatom', low_gas_price: 0.005, fixed_min_gas_price: 0.001 }] },
    };

    const assetList: ChainRegistryAssetList = {
      chain_name: 'cosmoshub',
      assets: [
        {
          denom_units: [{ denom: 'uatom', exponent: 0 }],
          base: 'uatom',
          display: 'uatom',
          symbol: 'ATOM',
        },
      ],
    };

    const config = fromChainRegistry(chain, 'https://rpc.test.com', assetList);
    const gas = config.feeCurrencies![0].gasPriceStep!;

    expect(gas.low).toBe(0.005);
    expect(gas.average).toBe(0.001); // fixed_min_gas_price fallback
    expect(gas.high).toBe(0.001); // fixed_min_gas_price fallback
  });
});

// ============================================================================
// toSuggestChainConfig
// ============================================================================

describe('toSuggestChainConfig', () => {
  it('generates complete config with sensible defaults', () => {
    const config = toSuggestChainConfig({
      chainId: 'rebar-1',
      chainName: 'Rebar',
      rpc: 'https://rpc.rebar.xyz:26657',
    });

    expect(config.bech32Config.bech32PrefixAccAddr).toBe('rebar');
    expect(config.bip44).toEqual({ coinType: 118 });
    expect(config.rest).toBe('https://rpc.rebar.xyz:1317');
    expect(config.currencies).toHaveLength(1);
    expect(config.currencies[0].coinDenom).toBe('REBAR');
    expect(config.currencies[0].coinMinimalDenom).toBe('urebar');
    expect(config.stakeCurrency).toEqual(config.currencies[0]);
    expect(config.feeCurrencies).toEqual(config.currencies);
  });

  it('uses provided values and passes through currencies', () => {
    const currencies = [{ coinDenom: 'TEST', coinMinimalDenom: 'utest', coinDecimals: 6 }];
    const config = toSuggestChainConfig({
      chainId: 'test-1',
      chainName: 'Test',
      rpc: 'https://rpc.test.com',
      rest: 'https://rest.test.com',
      bip44: { coinType: 330 },
      bech32Prefix: 'test',
      currencies,
    });

    expect(config.rest).toBe('https://rest.test.com');
    expect(config.bip44).toEqual({ coinType: 330 });
    expect(config.bech32Config.bech32PrefixAccAddr).toBe('test');
    expect(config.currencies).toBe(currencies);
  });
});
