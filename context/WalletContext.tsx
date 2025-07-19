'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getContract, getProvider} from '../utils/ethers';
import { ethers } from 'ethers';

interface WalletContextType {
  account: string | null;
  accounts: string[];
  chainId: number | null;
  error: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  selectAccount: (addr: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
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
        const accs = await provider.listAccounts();
        if (mounted) {
          const formatted = accs.map(a => ethers.utils.getAddress(a));
          setAccounts(formatted);
          setAccount(formatted[0] || null);
          const network = await provider.getNetwork();
          setChainId(network.chainId);
        }
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          const handleAccountsChanged = (newAccounts: string[]) => {
            if (!mounted) return;
            const formatted = newAccounts.map(a =>
              ethers.utils.getAddress(a)
            );
            setAccounts(formatted);
            setAccount(formatted[0] || null);
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
      const  provider  = getProvider();
      if (!provider) {
        setError('Please install MetaMask');
        return;
      }
      const accs: string[] = await provider.send('eth_requestAccounts', []);
      const formatted = accs.map(a => ethers.utils.getAddress(a));
      setAccounts(formatted);
      setAccount(formatted[0] || null);
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

  return (
    <WalletContext.Provider
      value={{
        account,
        accounts,
        chainId,
        error,
        isConnecting,
        connect,
        disconnect,
        selectAccount,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}