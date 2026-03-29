import { useEffect, type ReactNode, type MouseEventHandler } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portal for rendering modal outside the React tree.
 * Renders to document.body by default.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export interface ModalOverlayProps {
  onClick?: MouseEventHandler;
  className?: string;
}

/**
 * Semi-transparent overlay behind the modal.
 * Click to close (typically).
 */
export function ModalOverlay({ onClick, className }: ModalOverlayProps) {
  return (
    <div
      className={`rivet-modal-overlay ${className ?? ''}`}
      onClick={onClick}
      aria-hidden="true"
    />
  );
}

export interface ModalContentProps {
  children: ReactNode;
  className?: string;
  onEscapeKey?: () => void;
}

/**
 * Modal content container with escape key handling.
 */
export function ModalContent({ children, className, onEscapeKey }: ModalContentProps) {
  useEffect(() => {
    if (!onEscapeKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscapeKey();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscapeKey]);

  return (
    <div
      className={`rivet-modal-content ${className ?? ''}`}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}
