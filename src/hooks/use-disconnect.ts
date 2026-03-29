import { useCallback, useMemo } from 'react';
import type { UseDisconnectReturn } from '../types.js';
import { useRivetContext } from '../context.js';

/**
 * Hook for disconnecting wallets.
 *
 * Requires RivetProvider for multi-chain disconnect functionality.
 *
 * @example
 * ```tsx
 * function DisconnectButton() {
 *   const { disconnect, disconnectAll } = useDisconnect();
 *
 *   return (
 *     <div>
 *       <button onClick={() => disconnect('rebar-1')}>
 *         Disconnect Rebar
 *       </button>
 *       <button onClick={disconnectAll}>
 *         Disconnect All
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDisconnect(): UseDisconnectReturn {
  const context = useRivetContext();

  const disconnect = useCallback(
    (chainId?: string | string[]) => {
      if (!context) {
        console.warn('useDisconnect: RivetProvider required for disconnect functionality');
        return;
      }

      if (!chainId) return;

      const chainIds = Array.isArray(chainId) ? chainId : [chainId];
      chainIds.forEach((id) => context.disconnect(id));
    },
    [context]
  );

  const disconnectAll = useCallback(() => {
    if (!context) {
      console.warn('useDisconnect: RivetProvider required for disconnect functionality');
      return;
    }

    context.disconnectAll();
  }, [context]);

  return useMemo(
    () => ({
      disconnect,
      disconnectAll,
    }),
    [disconnect, disconnectAll]
  );
}
