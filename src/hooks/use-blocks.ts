import { useState, useEffect } from 'react';
import type { Rivet, NewBlockEvent } from '@rebarxyz/rivet';
import type { UseBlocksOptions, UseBlocksReturn } from '../types.js';

/**
 * Subscribe to new blocks. Holds the latest block only.
 *
 * Subscribes on mount via `client.subscribeBlocks()`, unsubscribes on unmount.
 * No-op when client is null or enabled is false.
 *
 * @example
 * ```tsx
 * const { client } = useRivet({ rpcUrl: 'https://rpc.rebar.xyz' });
 * const { latestBlock } = useBlocks(client);
 *
 * return <span>Block: {latestBlock?.height.toString()}</span>;
 * ```
 */
export function useBlocks(
  client: Rivet | null,
  options?: UseBlocksOptions,
): UseBlocksReturn {
  const enabled = options?.enabled ?? true;

  const [latestBlock, setLatestBlock] = useState<NewBlockEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!client || !enabled) {
      setIsSubscribed(false);
      return undefined;
    }

    try {
      const unsubscribe = client.subscribeBlocks((block) => {
        setLatestBlock(block);
      });
      setIsSubscribed(true);
      setError(null);

      return () => {
        unsubscribe();
        setIsSubscribed(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsSubscribed(false);
      return undefined;
    }
  }, [client, enabled]);

  return { latestBlock, isSubscribed, error };
}
