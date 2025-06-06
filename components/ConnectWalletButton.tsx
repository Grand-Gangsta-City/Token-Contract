'use client';
import React from 'react';
import { useWallet } from '../hooks/useWallet';

const ConnectWalletButton: React.FC = () => {
  const { account, error } = useWallet();

  if (error) {
    return (
      <button
        className="px-4 py-2 bg-red-500 text-white rounded-lg"
        onClick={() => alert(error)}
      >
        Wallet Error
      </button>
    );
  }

  if (!account) {
    return (
      <button
        className="px-4 py-2 bg-gold text-dark font-semibold rounded-lg hover:scale-105 transform transition"
        onClick={async () => {
          try {
            await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
            window.location.reload();
          } catch (e: any) {
            console.error(e.message);
          }
        }}
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="px-4 py-2 bg-dark text-gold font-mono rounded-lg border border-gold">
      {account.slice(0, 6)}...{account.slice(-4)}
    </div>
  );
};

export default ConnectWalletButton;