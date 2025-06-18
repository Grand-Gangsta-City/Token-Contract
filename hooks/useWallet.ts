'use client';
import { useEffect, useState } from 'react';
import { initEthers } from '../utils/ethers';
import { ethers } from 'ethers';

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      if (isConnecting) return;
      setIsConnecting(true);

      try {
        const { provider } = initEthers();
        if (!provider) {
          if (mounted) {
            setError('Please install MetaMask');
            setIsConnecting(false);
          }
          return;
        }

        // Check if already connected
        const accounts = await provider.listAccounts();
        if (accounts.length > 0 && mounted) {
          setAccount(ethers.utils.getAddress(accounts[0]));
          const network = await provider.getNetwork();
          setChainId(network.chainId);
        }

        // Set up event listeners
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          const handleAccountsChanged = (accounts: string[]) => {
            if (!mounted) return;
            if (accounts.length === 0) {
              setAccount(null);
            } else {
              setAccount(ethers.utils.getAddress(accounts[0]));
            }
          };

          const handleChainChanged = (chainIdHex: string) => {
            if (!mounted) return;
            setChainId(parseInt(chainIdHex, 16));
          };

          ethereum.on('accountsChanged', handleAccountsChanged);
          ethereum.on('chainChanged', handleChainChanged);

          // Cleanup function
          return () => {
            mounted = false;
            ethereum.removeListener('accountsChanged', handleAccountsChanged);
            ethereum.removeListener('chainChanged', handleChainChanged);
          };
        }
      } catch (e: any) {
        if (mounted) {
          setError(e.message);
        }
      } finally {
        if (mounted) {
          setIsConnecting(false);
        }
      }
    }

    setup();
  }, []);

  const connect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);

    try {
      const { provider } = initEthers();
      if (!provider) {
        setError('Please install MetaMask');
        return;
      }

      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        setAccount(ethers.utils.getAddress(accounts[0]));
        const network = await provider.getNetwork();
        setChainId(network.chainId);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return { account, chainId, error, connect, isConnecting };
}