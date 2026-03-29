import { useCallback, useMemo } from 'react';
import type { UseWalletModalReturn } from '../types.js';
import { useRivetContext } from '../context.js';

/**
 * Hook for controlling the wallet connect modal.
 *
 * Requires RivetProvider for state management, but you can
 * build your own modal state if not using the provider.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isOpen, chainId, open, close } = useWalletModal();
 *
 *   return (
 *     <>
 *       <button onClick={() => open('rebar-1')}>Connect</button>
 *       <ConnectModal open={isOpen} onClose={close} chainId={chainId ?? 'rebar-1'} />
 *     </>
 *   );
 * }
 * ```
 */
export function useWalletModal(): UseWalletModalReturn {
  const context = useRivetContext();

  // Fallback for standalone usage
  const fallbackState = useMemo(
    () => ({
      isOpen: false,
      chainId: null,
      open: (_chainId?: string) => {
        console.warn('useWalletModal: RivetProvider required for modal state management');
      },
      close: () => {
        console.warn('useWalletModal: RivetProvider required for modal state management');
      },
    }),
    []
  );

  if (!context) {
    return fallbackState;
  }

  const open = useCallback(
    (chainId?: string) => {
      context.openModal(chainId);
    },
    [context]
  );

  const close = useCallback(() => {
    context.closeModal();
  }, [context]);

  return useMemo(
    () => ({
      isOpen: context.modalState.isOpen,
      chainId: context.modalState.chainId,
      open,
      close,
    }),
    [context.modalState, open, close]
  );
}
