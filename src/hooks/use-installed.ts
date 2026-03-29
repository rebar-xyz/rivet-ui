import { useState, useEffect, useCallback, useMemo } from 'react';
import type { WalletType, UseInstalledWalletsReturn } from '../types.js';
import { getInstalledWallets, isWalletInstalled } from '../connector.js';

/**
 * Hook for detecting installed wallet extensions.
 *
 * Handles the async nature of wallet extension injection.
 * Wallets may not be immediately available on page load.
 *
 * @example
 * ```tsx
 * function WalletPicker() {
 *   const { wallets, isInstalled, isLoading } = useInstalledWallets();
 *
 *   if (isLoading) {
 *     return <p>Detecting wallets...</p>;
 *   }
 *
 *   if (wallets.length === 0) {
 *     return <p>No wallets found. Install Keplr or Leap.</p>;
 *   }
 *
 *   return (
 *     <div>
 *       {wallets.map((wallet) => (
 *         <button key={wallet}>{wallet}</button>
 *       ))}
 *       {!isInstalled('keplr') && (
 *         <a href="https://www.keplr.app">Install Keplr</a>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useInstalledWallets(): UseInstalledWalletsReturn {
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial check
    const detected = getInstalledWallets();
    setWallets(detected);

    // Wallet extensions may inject after DOMContentLoaded
    // Give them a short window to appear
    if (detected.length === 0) {
      const checkAgain = () => {
        const detected = getInstalledWallets();
        setWallets(detected);
        setIsLoading(false);
      };

      // Check after a short delay
      const timeout = setTimeout(checkAgain, 100);

      // Also check on window load
      if (document.readyState !== 'complete') {
        window.addEventListener('load', checkAgain, { once: true });
      } else {
        setIsLoading(false);
      }

      return () => {
        clearTimeout(timeout);
        window.removeEventListener('load', checkAgain);
      };
    } else {
      setIsLoading(false);
    }

    return undefined;
  }, []);

  const isInstalled = useCallback(
    (type: WalletType): boolean => {
      return isWalletInstalled(type);
    },
    []
  );

  return useMemo(
    () => ({
      wallets,
      isInstalled,
      isLoading,
    }),
    [wallets, isInstalled, isLoading]
  );
}
