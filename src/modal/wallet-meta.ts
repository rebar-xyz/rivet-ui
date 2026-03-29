import type { WalletType } from '../types.js';

export interface WalletMeta {
  name: string;
  icon: string;
  installUrl: string;
}

/**
 * Metadata for supported wallet extensions.
 * Icons are inline SVG data URIs for zero network requests.
 */
export const walletMeta: Record<WalletType, WalletMeta> = {
  keplr: {
    name: 'Keplr',
    icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' fill='none'%3E%3Crect width='40' height='40' rx='8' fill='%23291B54'/%3E%3Cpath d='M11.5 8.5v23l8.5-8.5 8.5 8.5v-23l-8.5 8.5-8.5-8.5z' fill='url(%23keplr-gradient)'/%3E%3Cdefs%3E%3ClinearGradient id='keplr-gradient' x1='11.5' y1='8.5' x2='28.5' y2='31.5' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%2358C6F8'/%3E%3Cstop offset='1' stop-color='%238B5CF6'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E`,
    installUrl: 'https://www.keplr.app/download',
  },
  leap: {
    name: 'Leap',
    icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' fill='none'%3E%3Crect width='40' height='40' rx='8' fill='%2329AB87'/%3E%3Cpath d='M10 30c0-11 9-20 20-20' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Cpath d='M10 20c0-5.5 4.5-10 10-10' stroke='white' stroke-width='4' stroke-linecap='round'/%3E%3Ccircle cx='28' cy='12' r='3' fill='white'/%3E%3C/svg%3E`,
    installUrl: 'https://www.leapwallet.io/download',
  },
  cosmostation: {
    name: 'Cosmostation',
    icon: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' fill='none'%3E%3Crect width='40' height='40' rx='8' fill='%239C6CFF'/%3E%3Ccircle cx='20' cy='20' r='12' stroke='white' stroke-width='2'/%3E%3Ccircle cx='20' cy='20' r='6' fill='white'/%3E%3Ccircle cx='20' cy='8' r='3' fill='white'/%3E%3Ccircle cx='30' cy='26' r='3' fill='white'/%3E%3Ccircle cx='10' cy='26' r='3' fill='white'/%3E%3C/svg%3E`,
    installUrl: 'https://www.cosmostation.io/wallet',
  },
};

/**
 * All supported wallet types in display order.
 */
export const WALLET_TYPES: WalletType[] = ['keplr', 'leap', 'cosmostation'];
