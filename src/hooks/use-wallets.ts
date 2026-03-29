import { useCallback, useMemo } from 'react';
import type { UseWalletsReturn, WalletState } from '../types.js';
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
 * Hook for accessing multi-chain wallet state.
 *
 * Requires RivetProvider.
 *
 * @example
 * ```tsx
 * function ChainStatus() {
 *   const { connections, connectedChains, hasAnyConnection, isConnected } = useWallets();
 *
 *   if (!hasAnyConnection) {
 *     return <p>No wallets connected</p>;
 *   }
 *
 *   return (
 *     <ul>
 *       {connectedChains.map((chainId) => (
 *         <li key={chainId}>
 *           {chainId}: {connections[chainId].address}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useWallets(): UseWalletsReturn {
  const context = useRivetContext();

  const connections = context?.connections ?? {};

  const getConnection = useCallback(
    (chainId: string): WalletState => {
      return connections[chainId] ?? initialState;
    },
    [connections]
  );

  const isConnected = useCallback(
    (chainId: string): boolean => {
      return connections[chainId]?.status === 'connected';
    },
    [connections]
  );

  const connectedChains = useMemo(
    () =>
      Object.entries(connections)
        .filter(([, state]) => state.status === 'connected')
        .map(([chainId]) => chainId),
    [connections]
  );

  const hasAnyConnection = connectedChains.length > 0;

  return useMemo(
    () => ({
      connections,
      getConnection,
      isConnected,
      connectedChains,
      hasAnyConnection,
    }),
    [connections, getConnection, isConnected, connectedChains, hasAnyConnection]
  );
}
