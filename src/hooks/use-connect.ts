import { useState, useCallback, useMemo } from 'react';
import type { WalletType, WalletState, UseConnectReturn } from '../types.js';
import { connectWallet } from '../connector.js';
import { useRivetContext } from '../context.js';

type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Mutation-style hook for wallet connection.
 *
 * Provides TanStack Query-style status flags and supports
 * connecting to multiple chains at once.
 *
 * @example
 * ```tsx
 * function ConnectButton() {
 *   const { connect, isPending, isSuccess, error, reset } = useConnect();
 *
 *   if (isPending) {
 *     return <button disabled>Connecting...</button>;
 *   }
 *
 *   if (isSuccess) {
 *     return <button onClick={reset}>Connected! Click to reset</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={() => connect({ chainId: 'rebar-1', walletType: 'keplr' })}>
 *         Connect Keplr
 *       </button>
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useConnect(): UseConnectReturn {
  const context = useRivetContext();
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const connectAsync = useCallback(
    async (args: { chainId: string | string[]; walletType?: WalletType }): Promise<WalletState> => {
      const chainIds = Array.isArray(args.chainId) ? args.chainId : [args.chainId];
      const walletType = args.walletType ?? context?.config.defaultWallet ?? 'keplr';

      setStatus('pending');
      setError(null);

      try {
        let lastState: WalletState | null = null;

        for (const chainId of chainIds) {
          if (context) {
            lastState = await context.connect(chainId, walletType);
          } else {
            // Standalone mode
            const result = await connectWallet(chainId, walletType);
            lastState = {
              status: 'connected',
              walletType,
              address: result.address,
              account: result.account,
              signer: result.signer,
              error: null,
            };
          }

          // Check for connection error
          if (lastState.status === 'error' && lastState.error) {
            throw lastState.error;
          }
        }

        setStatus('success');
        return lastState!;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setStatus('error');
        throw error;
      }
    },
    [context]
  );

  const connect = useCallback(
    (args: { chainId: string | string[]; walletType?: WalletType }) => {
      connectAsync(args).catch(() => {
        // Error state is already set in connectAsync
      });
    },
    [connectAsync]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return useMemo(
    () => ({
      connect,
      connectAsync,
      isPending: status === 'pending',
      isSuccess: status === 'success',
      isError: status === 'error',
      status,
      error,
      reset,
    }),
    [connect, connectAsync, status, error, reset]
  );
}
