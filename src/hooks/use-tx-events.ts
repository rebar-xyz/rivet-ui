import { useState, useEffect, useCallback } from 'react';
import type { Rivet, TxEvent } from '@rebarxyz/rivet';
import type { UseTxEventsOptions, UseTxEventsReturn } from '../types.js';

const DEFAULT_BUFFER_SIZE = 20;

/**
 * Subscribe to transactions matching a CometBFT query. Holds a bounded buffer
 * of recent events (most recent first).
 *
 * @example
 * ```tsx
 * const { client } = useRivet({ rpcUrl: 'https://rpc.rebar.xyz' });
 * const { events, latestTx } = useTxEvents(client, "message.sender='rebar1abc...'");
 *
 * return (
 *   <ul>
 *     {events.map(tx => <li key={tx.hash}>{tx.hash}</li>)}
 *   </ul>
 * );
 * ```
 */
export function useTxEvents(
  client: Rivet | null,
  query: string,
  options?: UseTxEventsOptions,
): UseTxEventsReturn {
  const enabled = options?.enabled ?? true;
  const bufferSize = options?.bufferSize ?? DEFAULT_BUFFER_SIZE;

  const [events, setEvents] = useState<TxEvent[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const clear = useCallback(() => setEvents([]), []);

  useEffect(() => {
    if (!client || !enabled || !query) {
      setIsSubscribed(false);
      return undefined;
    }

    try {
      const unsubscribe = client.subscribeTxs(query, (tx) => {
        setEvents((prev) => [tx, ...prev].slice(0, bufferSize));
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
  }, [client, query, enabled, bufferSize]);

  const latestTx = events.length > 0 ? events[0] : null;

  return { latestTx, events, isSubscribed, error, clear };
}
