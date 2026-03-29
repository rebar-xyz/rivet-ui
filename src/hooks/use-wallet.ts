import { useState, useCallback, useMemo, useEffect } from 'react';
import type { WalletType, WalletState, UseWalletReturn } from '../types.js';
import { connectWallet, onAccountChange, silentReconnect } from '../connector.js';
import { useRivetContext } from '../context.js';

const initialState: WalletState = {
  status: 'disconnected',
  walletType: null,
  address: null,
  account: null,
  signer: null,
  error: null,
};

/**
 * React hook for single-chain wallet connection.
 *
 * Works both with and without RivetProvider:
 * - With provider: Uses shared state, persistence, and auto-reconnect
 * - Without provider: Standalone mode with local state only
 *
 * @param chainId - The chain ID to connect to (e.g., 'cosmoshub-4', 'rebar-1')
 * @returns Wallet state and actions
 *
 * @example
 * ```tsx
 * function App() {
 *   const { status, address, signer, connect, disconnect, isConnected } = useWallet('rebar-1');
 *
 *   if (isConnected) {
 *     return (
 *       <div>
 *         <span>Connected: {address}</span>
 *         <button onClick={disconnect}>Disconnect</button>
 *       </div>
 *     );
 *   }
 *
 *   return (
 *     <button onClick={() => connect('keplr')} disabled={status === 'connecting'}>
 *       {status === 'connecting' ? 'Connecting...' : 'Connect Keplr'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useWallet(chainId: string): UseWalletReturn {
  const context = useRivetContext();

  // If we have context, delegate to provider
  if (context) {
    return useWalletWithContext(chainId, context);
  }

  // Standalone mode — warn since this usually means a missing provider
  // or duplicate React instances (e.g. symlinked packages resolving their own react)
  console.warn(
    '[rivet-ui] useWallet: No RivetProvider found — falling back to standalone mode. ' +
    'If you have a RivetProvider, this likely means duplicate React instances ' +
    '(check symlinked/file: dependencies resolving their own react).'
  );

  return useWalletStandalone(chainId);
}

/**
 * Wallet hook using RivetProvider context.
 */
function useWalletWithContext(
  chainId: string,
  context: NonNullable<ReturnType<typeof useRivetContext>>
): UseWalletReturn {
  const state = context.connections[chainId] ?? initialState;

  const connect = useCallback(
    async (walletType?: WalletType) => {
      const type = walletType ?? context.config.defaultWallet;
      await context.connect(chainId, type);
    },
    [chainId, context]
  );

  const disconnect = useCallback(() => {
    context.disconnect(chainId);
  }, [chainId, context]);

  return useMemo(
    () => ({
      ...state,
      connect,
      disconnect,
      isConnected: state.status === 'connected',
      isDisconnected: state.status === 'disconnected',
      isConnecting: state.status === 'connecting' || state.status === 'reconnecting',
    }),
    [state, connect, disconnect]
  );
}

/**
 * Standalone wallet hook (without provider).
 */
function useWalletStandalone(chainId: string): UseWalletReturn {
  const [state, setState] = useState<WalletState>(initialState);

  const connect = useCallback(
    async (walletType?: WalletType) => {
      const type = walletType ?? 'keplr';

      setState({
        ...initialState,
        status: 'connecting',
        walletType: type,
      });

      try {
        const result = await connectWallet(chainId, type);

        setState({
          status: 'connected',
          walletType: type,
          address: result.address,
          account: result.account,
          signer: result.signer,
          error: null,
        });
      } catch (err) {
        setState({
          ...initialState,
          status: 'error',
          walletType: type,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    },
    [chainId]
  );

  const disconnect = useCallback(() => {
    setState(initialState);
  }, []);

  // Handle account changes in standalone mode
  useEffect(() => {
    if (state.status !== 'connected' || !state.walletType) return;

    return onAccountChange(async () => {
      if (!state.walletType) return;

      setState((prev) => ({ ...prev, status: 'reconnecting' }));

      const result = await silentReconnect(chainId, state.walletType);

      if (result) {
        setState({
          status: 'connected',
          walletType: state.walletType,
          address: result.address,
          account: result.account,
          signer: result.signer,
          error: null,
        });
      } else {
        setState(initialState);
      }
    });
  }, [chainId, state.status, state.walletType]);

  return useMemo(
    () => ({
      ...state,
      connect,
      disconnect,
      isConnected: state.status === 'connected',
      isDisconnected: state.status === 'disconnected',
      isConnecting: state.status === 'connecting' || state.status === 'reconnecting',
    }),
    [state, connect, disconnect]
  );
}
