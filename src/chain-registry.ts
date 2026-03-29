import type { ChainConfig, Currency, FeeCurrency } from './types.js';

/**
 * Minimal chain-registry Chain type (subset of fields we use).
 * Users can pass full chain-registry Chain objects.
 */
export interface ChainRegistryChain {
  chain_id: string;
  chain_name: string;
  bech32_prefix?: string;
  slip44?: number;
  apis?: {
    rpc?: Array<{ address: string; provider?: string }>;
    rest?: Array<{ address: string; provider?: string }>;
  };
  staking?: {
    staking_tokens?: Array<{ denom: string }>;
  };
  fees?: {
    fee_tokens?: Array<{
      denom: string;
      fixed_min_gas_price?: number;
      low_gas_price?: number;
      average_gas_price?: number;
      high_gas_price?: number;
    }>;
  };
}

/**
 * Minimal chain-registry AssetList type.
 */
export interface ChainRegistryAssetList {
  chain_name: string;
  assets: Array<{
    denom_units: Array<{ denom: string; exponent: number }>;
    base: string;
    name?: string;
    display: string;
    symbol: string;
    coingecko_id?: string;
  }>;
}

/**
 * Convert a chain-registry Chain object to a ChainConfig.
 *
 * @param chain - Chain object from chain-registry
 * @param rpcOverride - Optional RPC URL override (defaults to first available)
 * @param assetList - Optional AssetList for currency information
 *
 * @example
 * ```ts
 * import { chains, assets } from 'chain-registry';
 *
 * const cosmosHub = fromChainRegistry(
 *   chains.find(c => c.chain_id === 'cosmoshub-4')!,
 *   'https://rpc.cosmos.network',
 *   assets.find(a => a.chain_name === 'cosmoshub')
 * );
 * ```
 */
export function fromChainRegistry(
  chain: ChainRegistryChain,
  rpcOverride?: string,
  assetList?: ChainRegistryAssetList
): ChainConfig {
  const rpc = rpcOverride ?? chain.apis?.rpc?.[0]?.address;
  if (!rpc) {
    throw new Error(`No RPC endpoint found for chain ${chain.chain_id}. Provide an rpcOverride.`);
  }

  const rest = chain.apis?.rest?.[0]?.address;

  // Build currencies from asset list if provided
  let currencies: Currency[] | undefined;
  let stakeCurrency: Currency | undefined;
  let feeCurrencies: FeeCurrency[] | undefined;

  if (assetList && assetList.assets.length > 0) {
    currencies = assetList.assets.map((asset) => {
      const displayUnit = asset.denom_units.find((u) => u.denom === asset.display);
      const baseUnit = asset.denom_units.find((u) => u.denom === asset.base);

      return {
        coinDenom: asset.symbol,
        coinMinimalDenom: asset.base,
        coinDecimals: displayUnit?.exponent ?? baseUnit?.exponent ?? 6,
        coinGeckoId: asset.coingecko_id,
      };
    });

    // Find staking currency
    const stakingDenom = chain.staking?.staking_tokens?.[0]?.denom;
    if (stakingDenom) {
      stakeCurrency = currencies.find((c) => c.coinMinimalDenom === stakingDenom);
    }

    // Build fee currencies from chain fees
    if (chain.fees?.fee_tokens) {
      const feeResults: FeeCurrency[] = [];
      for (const feeToken of chain.fees.fee_tokens) {
        const currency = currencies!.find((c) => c.coinMinimalDenom === feeToken.denom);
        if (!currency) continue;

        const gasPriceStep =
          feeToken.low_gas_price !== undefined ||
          feeToken.average_gas_price !== undefined ||
          feeToken.high_gas_price !== undefined
            ? {
                low: feeToken.low_gas_price ?? feeToken.fixed_min_gas_price ?? 0.01,
                average: feeToken.average_gas_price ?? feeToken.fixed_min_gas_price ?? 0.025,
                high: feeToken.high_gas_price ?? feeToken.fixed_min_gas_price ?? 0.04,
              }
            : undefined;

        feeResults.push({
          ...currency,
          gasPriceStep,
        });
      }
      feeCurrencies = feeResults;
    }
  }

  return {
    chainId: chain.chain_id,
    chainName: chain.chain_name,
    rpc,
    rest,
    bip44: chain.slip44 !== undefined ? { coinType: chain.slip44 } : undefined,
    bech32Prefix: chain.bech32_prefix,
    currencies,
    feeCurrencies,
    stakeCurrency,
  };
}

/**
 * Build a full Keplr/Leap chain suggestion config from ChainConfig.
 * Use this with suggestChain() for chains not built into the wallet.
 */
export function toSuggestChainConfig(config: ChainConfig) {
  const prefix = config.bech32Prefix ?? config.chainId.split('-')[0];

  const currencies = config.currencies ?? [
    {
      coinDenom: prefix.toUpperCase(),
      coinMinimalDenom: `u${prefix}`,
      coinDecimals: 6,
    },
  ];

  const feeCurrencies = config.feeCurrencies ?? currencies;
  const stakeCurrency = config.stakeCurrency ?? currencies[0];

  return {
    chainId: config.chainId,
    chainName: config.chainName,
    rpc: config.rpc,
    rest: config.rest ?? config.rpc.replace(/:\d+$/, ':1317'),
    bip44: config.bip44 ?? { coinType: 118 },
    bech32Config: {
      bech32PrefixAccAddr: prefix,
      bech32PrefixAccPub: `${prefix}pub`,
      bech32PrefixValAddr: `${prefix}valoper`,
      bech32PrefixValPub: `${prefix}valoperpub`,
      bech32PrefixConsAddr: `${prefix}valcons`,
      bech32PrefixConsPub: `${prefix}valconspub`,
    },
    currencies,
    feeCurrencies,
    stakeCurrency,
  };
}
