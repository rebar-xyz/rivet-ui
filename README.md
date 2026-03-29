# @rebarxyz/rivet-ui

React wallet management for Cosmos chains. Handles wallet detection, connection, multi-chain state, persistence, and modal UI with zero external dependencies beyond React itself.

## Install

```bash
pnpm add @rebarxyz/rivet-ui @rebarxyz/rivet
```

## Quick Start

```tsx
import { RivetProvider, useWallet, useWalletModal } from '@rebarxyz/rivet-ui';
import { ConnectModal } from '@rebarxyz/rivet-ui/modal';
import '@rebarxyz/rivet-ui/modal/styles.css';

function App() {
  return (
    <RivetProvider config={{ autoReconnect: true }}>
      <WalletButton />
    </RivetProvider>
  );
}

function WalletButton() {
  const { status, address, disconnect } = useWallet('cosmoshub-4');
  const { isOpen, open, close } = useWalletModal();

  return (
    <>
      {status === 'connected' ? (
        <div>
          <span>{address?.slice(0, 12)}...</span>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={() => open('cosmoshub-4')}>Connect Wallet</button>
      )}
      <ConnectModal open={isOpen} onClose={close} chainId="cosmoshub-4" />
    </>
  );
}
```

## Why Rivet UI?

**Zero external dependencies.** Pure React state management — no TanStack Query, Zustand, or Jotai in your dependency tree. The entire package is ~10 KB gzipped.

**Tree-shakeable.** The modal component lives in a separate entry point (`@rebarxyz/rivet-ui/modal`). If you only need hooks, you don't pay for modal code. `sideEffects: false` except for CSS.

**Works without a provider.** `useWallet()` works standalone for simple single-chain apps. Add `RivetProvider` when you need multi-chain state, auto-reconnect, or persistence.

**Structural typing for wallets.** Keplr, Leap, and Cosmostation are detected and connected without importing their SDKs. The `OfflineDirectSigner` interface is satisfied at runtime.

**CSS custom properties for theming.** Override `--rivet-*` variables to match your design system. No CSS-in-JS runtime, no style conflicts.

**Render props for full control.** The modal works out of the box, but `renderWallet`, `renderHeader`, and `renderFooter` let you customize everything without forking.

### Not in scope

Rivet UI is for browser wallet extensions only. No WalletConnect (mobile wallets), no Ledger integration (Keplr/Leap handle this internally), no balance queries (use rivet core's RPC client directly), and no built-in TanStack Query integration (wrap the hooks yourself if needed).

## Usage

### Provider Setup

```tsx
import { RivetProvider } from '@rebarxyz/rivet-ui';

<RivetProvider config={{
  autoReconnect: true,           // Restore connections on page load
  defaultWallet: 'keplr',        // Default wallet type
  chains: [{                     // Optional: pre-configured chains
    chainId: 'cosmoshub-4',
    chainName: 'Cosmos Hub',
    rpc: 'https://rpc.cosmos.network',
  }],
}}>
  <App />
</RivetProvider>
```

### Hooks

```tsx
import { useWallet, useConnect, useWallets, useInstalledWallets } from '@rebarxyz/rivet-ui';

// Single chain connection
const { status, address, signer, connect, disconnect } = useWallet('cosmoshub-4');

// Mutation-style connect (TanStack Query pattern)
const { connect, isPending, isError, error, reset } = useConnect();
await connect({ chainId: 'cosmoshub-4', walletType: 'keplr' });

// Multi-chain state (requires provider)
const { connections, isConnected, connectedChains } = useWallets();

// Wallet detection
const { wallets, isInstalled, isLoading } = useInstalledWallets();
```

### Transaction Signing

```tsx
import { useRivet } from '@rebarxyz/rivet-ui';
import { defineProto } from '@rebarxyz/rivet';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';

const bank = defineProto({ MsgSend }, 'cosmos.bank.v1beta1');

function SendForm() {
  const { client, isReady } = useRivet({
    chainId: 'cosmoshub-4',
    rpcUrl: 'https://rpc.cosmos.network',
  });

  const send = async () => {
    if (!client) return;
    await client.signAndBroadcast({
      messages: [bank.Send({
        fromAddress: '...',
        toAddress: '...',
        amount: [{ denom: 'uatom', amount: '1000000' }],
      })],
    });
  };

  return <button onClick={send} disabled={!isReady}>Send</button>;
}
```

### Modal Theming

Override CSS custom properties to match your design:

```css
.rivet-modal {
  --rivet-bg: #0a0a0a;
  --rivet-bg-secondary: #1a1a1a;
  --rivet-text: #fafafa;
  --rivet-text-secondary: #a1a1a1;
  --rivet-border: #2a2a2a;
  --rivet-accent: #3b82f6;
  --rivet-accent-hover: #2563eb;
  --rivet-radius: 16px;
  --rivet-padding: 24px;
}
```

Or use the built-in dark theme:

```tsx
<ConnectModal open={isOpen} onClose={close} chainId="cosmoshub-4" theme="dark" />
```

### Custom Modal Rendering

```tsx
<ConnectModal
  open={isOpen}
  onClose={close}
  chainId="cosmoshub-4"
  wallets={['keplr', 'leap']}  // Only show specific wallets
  renderWallet={(wallet, { connect, isConnecting, isInstalled }) => (
    <MyWalletButton
      wallet={wallet}
      onClick={() => connect(wallet)}
      loading={isConnecting}
      disabled={!isInstalled}
    />
  )}
  renderHeader={() => <MyHeader />}
  renderFooter={() => <MyFooter />}
  onConnect={(wallet) => console.log('Connected:', wallet)}
  onError={(err, wallet) => console.error('Failed:', wallet, err)}
/>
```

### Headless Primitives

Build your own modal from scratch:

```tsx
import { useConnect, useInstalledWallets } from '@rebarxyz/rivet-ui';
import { ModalPortal, ModalOverlay, walletMeta } from '@rebarxyz/rivet-ui/modal';

function CustomModal({ open, onClose, chainId }) {
  const { connect, isPending } = useConnect();
  const { wallets } = useInstalledWallets();

  if (!open) return null;

  return (
    <ModalPortal>
      <ModalOverlay onClick={onClose} />
      <div className="my-modal">
        {wallets.map(wallet => (
          <button
            key={wallet}
            onClick={() => connect({ chainId, walletType: wallet })}
            disabled={isPending}
          >
            <img src={walletMeta[wallet].icon} alt={walletMeta[wallet].name} />
            {walletMeta[wallet].name}
          </button>
        ))}
      </div>
    </ModalPortal>
  );
}
```

### Chain Registry

Convert chain-registry format directly:

```tsx
import { RivetProvider, fromChainRegistry } from '@rebarxyz/rivet-ui';
import { chains } from 'chain-registry';

const cosmosHub = fromChainRegistry(
  chains.find(c => c.chain_id === 'cosmoshub-4')!,
  'https://rpc.cosmos.network'  // Optional RPC override
);

<RivetProvider config={{ chains: [cosmosHub], autoReconnect: true }}>
  <App />
</RivetProvider>
```

## Bundle Size

| Entry Point | Unminified | Gzipped |
|---|---|---|
| `@rebarxyz/rivet-ui` | 24 KB | ~5.3 KB |
| `@rebarxyz/rivet-ui/modal` | 14 KB | ~3.6 KB |
| `modal/styles.css` | 5 KB | ~1.5 KB |
| **Total** | **43 KB** | **~10.4 KB** |

## Supported Wallets

| Wallet | Detection | Connect | Account Change Events |
|---|---|---|---|
| Keplr | Yes | Yes | Yes |
| Leap | Yes | Yes | Yes |
| Cosmostation | Yes | Yes | Yes |

Wallet icons are inline SVG data URIs — no network requests for images.

## Comparison

| | Rivet UI | interchain-kit | cosmos-kit |
|---|---|---|---|
| Bundle size | ~10 KB gzipped | ~2 MB | ~1.5 MB |
| External dependencies | 0 (React only) | TanStack Query, Zustand | Zustand, many adapters |
| Wallet adapter packages | 0 | 1 per wallet | 1 per wallet |
| WalletConnect | No | Yes | Yes |
| Ledger direct | No | Yes | Yes |
| Provider required | Optional | Yes | Yes |
| CSS-in-JS | No | Chakra UI | Chakra UI |

Rivet UI is the right choice if you want a minimal, zero-dependency wallet layer for browser extensions on Cosmos SDK chains. If you need WalletConnect, direct Ledger support, or extensive wallet coverage, use cosmos-kit or interchain-kit.

## API Reference

### Hooks

| Hook | Description |
|---|---|
| `useWallet(chainId)` | Single-chain connection state and actions |
| `useConnect()` | Mutation-style connect with status flags |
| `useDisconnect()` | Disconnect from chains |
| `useWallets()` | Multi-chain state (requires provider) |
| `useRivet(opts)` | Create a Rivet client from wallet state |
| `useInstalledWallets()` | Detect installed wallet extensions |
| `useWalletModal()` | Modal open/close state |

### Components

| Component | Description |
|---|---|
| `RivetProvider` | Context provider for multi-chain state |
| `ConnectModal` | Styled wallet connection modal |
| `ModalPortal` | Renders children in document.body |
| `ModalOverlay` | Backdrop with click-to-close |
| `ModalContent` | Modal container with escape key handling |

### Types

```typescript
type WalletType = 'keplr' | 'leap' | 'cosmostation';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface WalletState {
  status: ConnectionStatus;
  walletType: WalletType | null;
  address: string | null;
  signer: OfflineDirectSigner | null;
  error: Error | null;
}
```
