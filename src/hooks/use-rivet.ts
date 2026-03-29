import { useState, useEffect, useMemo } from 'react';
import { Rivet } from '@rebarxyz/rivet';
import type { UseRivetOptions, UseRivetReturn } from '../types.js';
import { useWallet } from './use-wallet.js';

/**
 * Hook for creating a Rivet client.
 *
 * Always creates a read-only client from rpcUrl. When `withWallet` is set,
 * attaches the connected wallet's signer for signing capability.
 *
 * @example
 * ```tsx
 * // Read-only — available immediately
 * const { client } = useRivet({ rpcUrl: 'https://rpc.rebar.xyz' });
 *
 * // With wallet — client exists immediately, canSign becomes true when connected
 * const { client, canSign } = useRivet({
 *   rpcUrl: 'https://rpc.rebar.xyz',
 *   withWallet: 'rebar-1',
 *   gasConfig: { gasPrice: '0.025urebar' },
 * });
 *
 * const handleSend = async () => {
 *   if (!client || !canSign) return;
 *   await client.signAndBroadcast({ messages: [...] });
 * };
 * ```
 */
export function useRivet(options: UseRivetOptions): UseRivetReturn {
  const { rpcUrl, withWallet, gasConfig } = options;

  // Always call useWallet (hooks can't be conditional). Pass empty string when
  // no wallet is requested — useWallet returns disconnected state which we ignore.
  const { signer, isConnected } = useWallet(withWallet ?? '');
  const activeSigner = withWallet && isConnected ? signer : null;

  const [client, setClient] = useState<Rivet | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const rivet = Rivet.connect(rpcUrl, {
        wallet: activeSigner ?? undefined,
        chainId: withWallet ?? undefined,
        gasConfig,
      });
      setClient(rivet);
      setError(null);
    } catch (err) {
      setClient(null);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [rpcUrl, activeSigner, withWallet, gasConfig]);

  return useMemo(
    () => ({
      client,
      isReady: client !== null,
      canSign: client !== null && activeSigner !== null,
      error,
    }),
    [client, activeSigner, error],
  );
}
