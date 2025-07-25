'use client';
import { useEffect, useState } from 'react';
import { getProvider } from '../utils/ethers';
import { ethers } from 'ethers';

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      if (isConnecting) return;
      setIsConnecting(true);

      try {
        const  provider  = getProvider();
        if (!provider) {
          setError('Please install MetaMask');
          return;
        }

        // Initial fetch of connected accounts
        const accs = await provider.listAccounts();
        if (mounted) {
          const formatted = accs.map(a => ethers.utils.getAddress(a));
          setAccounts(formatted);
          setAccount(formatted[0] || null);
          const network = await provider.getNetwork();
          setChainId(network.chainId);
        }

        // Subscribe to account / chain changes
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          const handleAccountsChanged = (newAccounts: string[]) => {
            if (!mounted) return;
            const f = newAccounts.map(a => ethers.utils.getAddress(a));
            setAccounts(f);
            setAccount(f[0] || null);
          };
          const handleChainChanged = (chainIdHex: string) => {
            if (!mounted) return;
            setChainId(parseInt(chainIdHex, 16));
          };
          ethereum.on('accountsChanged', handleAccountsChanged);
          ethereum.on('chainChanged', handleChainChanged);

          return () => {
            mounted = false;
            ethereum.removeListener('accountsChanged', handleAccountsChanged);
            ethereum.removeListener('chainChanged', handleChainChanged);
          };
        }
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setIsConnecting(false);
      }
    }

    setup();
  }, []);

  const connect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      const provider = getProvider();
      if (!provider) {
        setError('Please install MetaMask');
        return;
      }
      const accs: string[] = await provider.send('eth_requestAccounts', []);
      const f = accs.map(a => ethers.utils.getAddress(a));
      setAccounts(f);
      setAccount(f[0] || null);
      const network = await provider.getNetwork();
      setChainId(network.chainId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setAccounts([]);
    setChainId(null);
  };

  const selectAccount = (addr: string) => {
    if (accounts.includes(addr)) {
      setAccount(addr);
    }
  };

  return {
    account,
    accounts,
    chainId,
    error,
    connect,
    disconnect,
    selectAccount,
    isConnecting,
  };
}
