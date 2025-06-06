'use client';
import { useEffect, useState } from 'react';
import { initEthers } from '../utils/ethers';
import { ethers } from 'ethers';

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        const { provider } = initEthers();
        if (!provider) {
          setError('Please install MetaMask');
          return;
        }
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(ethers.utils.getAddress(accounts[0]));
        const network = await provider.getNetwork();
        setChainId(network.chainId);

        (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length === 0) {
            setAccount(null);
          } else {
            setAccount(ethers.utils.getAddress(accounts[0]));
          }
        });
        (window as any).ethereum.on('chainChanged', (chainIdHex: string) => {
          setChainId(parseInt(chainIdHex, 16));
        });
      } catch (e: any) {
        setError(e.message);
      }
    }
    setup();
  }, []);

  return { account, chainId, error };
}