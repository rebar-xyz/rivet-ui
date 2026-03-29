import { useCallback, type ReactNode } from 'react';
import type { WalletType } from '../types.js';
// Import hooks from the main package entry to share the same RivetContext instance.
// Relative imports would get bundled into this modal chunk, creating a duplicate context.
import { useConnect, useInstalledWallets } from '@rebarxyz/rivet-ui';
import { ModalPortal, ModalOverlay, ModalContent } from './primitives.js';
import { walletMeta, WALLET_TYPES } from './wallet-meta.js';

export interface WalletRenderProps {
  connect: (wallet: WalletType) => void;
  isConnecting: boolean;
  connectingWallet: WalletType | null;
  isInstalled: boolean;
}

export interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
  chainId: string;

  /** Custom class for the modal root */
  className?: string;

  /** Theme variant */
  theme?: 'light' | 'dark';

  /** Only show these wallets (default: all) */
  wallets?: WalletType[];

  /** Custom wallet button renderer */
  renderWallet?: (wallet: WalletType, props: WalletRenderProps) => ReactNode;

  /** Custom header renderer */
  renderHeader?: () => ReactNode;

  /** Custom footer renderer */
  renderFooter?: () => ReactNode;

  /** Called after successful connection */
  onConnect?: (wallet: WalletType) => void;

  /** Called on connection error */
  onError?: (error: Error, wallet: WalletType) => void;
}

/**
 * Styled wallet connect modal.
 *
 * Works out of the box with sensible defaults, but fully customizable
 * via render props for custom designs.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ConnectModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   chainId="rebar-1"
 * />
 *
 * // With theme
 * <ConnectModal
 *   open={isOpen}
 *   onClose={close}
 *   chainId="rebar-1"
 *   theme="dark"
 * />
 *
 * // Custom wallet rendering
 * <ConnectModal
 *   open={isOpen}
 *   onClose={close}
 *   chainId="rebar-1"
 *   renderWallet={(wallet, { connect, isConnecting, isInstalled }) => (
 *     <MyWalletButton
 *       wallet={wallet}
 *       onClick={() => connect(wallet)}
 *       loading={isConnecting}
 *       disabled={!isInstalled}
 *     />
 *   )}
 * />
 * ```
 */
export function ConnectModal({
  open,
  onClose,
  chainId,
  className,
  theme,
  wallets = WALLET_TYPES,
  renderWallet,
  renderHeader,
  renderFooter,
  onConnect,
  onError,
}: ConnectModalProps) {
  const { connectAsync, isPending, reset } = useConnect();
  const { isInstalled } = useInstalledWallets();

  // Track which wallet is being connected
  const connectingWallet = isPending ? (wallets[0] ?? null) : null;

  const handleConnect = useCallback(
    async (wallet: WalletType) => {
      if (!isInstalled(wallet)) {
        window.open(walletMeta[wallet].installUrl, '_blank');
        return;
      }

      try {
        await connectAsync({ chainId, walletType: wallet });
        onConnect?.(wallet);
        onClose();
        reset();
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)), wallet);
      }
    },
    [chainId, connectAsync, isInstalled, onClose, onConnect, onError, reset]
  );

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  if (!open) return null;

  // Base render props - isInstalled gets overridden per wallet in the render loop
  const baseRenderProps = {
    connect: handleConnect,
    isConnecting: isPending,
    connectingWallet,
  };

  return (
    <ModalPortal>
      <ModalOverlay onClick={handleClose} />
      <ModalContent
        className={`rivet-modal ${className ?? ''}`}
        onEscapeKey={handleClose}
        {...(theme ? { 'data-theme': theme } : {})}
      >
        {/* Header */}
        {renderHeader ? (
          renderHeader()
        ) : (
          <div className="rivet-modal-header">
            <h2 className="rivet-modal-title">Connect Wallet</h2>
            <button
              className="rivet-modal-close"
              onClick={handleClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="rivet-modal-body">
          {wallets.map((wallet) => {
            const installed = isInstalled(wallet);
            const meta = walletMeta[wallet];
            const isCurrentlyConnecting = isPending && connectingWallet === wallet;

            if (renderWallet) {
              return (
                <div key={wallet}>
                  {renderWallet(wallet, {
                    ...baseRenderProps,
                    isInstalled: installed,
                  })}
                </div>
              );
            }

            return (
              <button
                key={wallet}
                className="rivet-wallet-button"
                onClick={() => handleConnect(wallet)}
                disabled={isPending}
                data-connecting={isCurrentlyConnecting}
              >
                <img
                  src={meta.icon}
                  alt={meta.name}
                  className="rivet-wallet-icon"
                />
                <div className="rivet-wallet-info">
                  <span className="rivet-wallet-name">{meta.name}</span>
                  <span
                    className="rivet-wallet-status"
                    data-installed={installed}
                  >
                    {installed ? 'Detected' : 'Not installed'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        {renderFooter ? (
          renderFooter()
        ) : (
          <div className="rivet-modal-footer">
            New to Cosmos?{' '}
            <a
              href="https://cosmos.network/wallets"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn about wallets
            </a>
          </div>
        )}
      </ModalContent>
    </ModalPortal>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M15 5L5 15M5 5l10 10" />
    </svg>
  );
}
