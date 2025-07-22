// hooks/useNetwork.ts
'use client';

import { useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { CHAIN_INFO } from '../utils/chains';

export function useNetwork() {
  const { chainId } = useWallet();

  // the Seh Mainnet info from your CHAIN_INFO map
  const target = CHAIN_INFO[1329]!;

  // only read window.ethereum on the client
  const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;

  // lookup current chain info or null if unknown
  const current = chainId != null ? CHAIN_INFO[chainId] ?? null : null;
  console.log('Current network:', current);
  // memoize the switch function
  const switchToSei = useCallback(async () => {
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: target.hex }],
      });
    } catch (err: any) {
      // 4902 = chain not added
      if (err.code === 4902 && target.rpcUrls) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: target.hex,
            chainName: target.name,
            rpcUrls: target.rpcUrls,
            nativeCurrency: { name: 'Sei', symbol: 'SEI', decimals: 18 },
            blockExplorerUrls: target.explorer ? [target.explorer] : [],
          }],
        });
      } else {
        console.error('Failed to switch network', err);
      }
    }
  }, [ethereum, target]);

  return { current, target, switchToSei };
}
