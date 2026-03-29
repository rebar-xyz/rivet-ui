import { useEffect, useRef } from 'react';
import type { Rivet, SubscriptionEvent } from '@rebarxyz/rivet';
import type { UseSubscriptionOptions } from '../types.js';

/**
 * Raw CometBFT subscription with lifecycle management.
 *
 * Subscribes on mount, unsubscribes on unmount, calls your callback on each
 * event. No React state — the callback IS the API.
 *
 * @example
 * ```tsx
 * const { client } = useRivet({ rpcUrl: 'https://rpc.rebar.xyz' });
 *
 * useSubscription(client, "tm.event='ValidatorSetUpdates'", (event) => {
 *   console.log('Validator set updated', event);
 * });
 * ```
 */
export function useSubscription(
  client: Rivet | null,
  query: string,
  callback: (event: SubscriptionEvent) => void,
  options?: UseSubscriptionOptions,
): void {
  const enabled = options?.enabled ?? true;

  // Stable ref so subscription doesn't restart when callback identity changes
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!client || !enabled || !query) return;

    const unsubscribe = client.subscribe(query, (event) => {
      callbackRef.current(event as SubscriptionEvent);
    });

    return unsubscribe;
  }, [client, query, enabled]);
}
