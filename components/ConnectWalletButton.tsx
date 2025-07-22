'use client';
import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { X } from 'lucide-react';
import Image from 'next/image';
import styles from './ConnectWalletModal.module.css';

export default function ConnectWalletButton() {
  const {
    account,
    accounts,
    error,
    connect,
    disconnect,
    selectAccount,
    isConnecting,
  } = useWallet();

  const [showModal, setShowModal] = useState(false);

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
        className="px-4 py-2 bg-gold text-dark font-semibold rounded-lg hover:scale-105 transform transition disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={connect}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-dark text-gold font-mono rounded-lg border border-gold flex items-center space-x-2"
      >
        <img
          src="/GGClogo.png"
          alt="logo"
          width={16}
          height={16}
        />
        <span>
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
      </button>

      {showModal && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowModal(false)}
        >
          <div
            className={styles.modalContainer}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalOverlay} />
            <div className={styles.modalContent}>
              <div className={styles.header}>
                <img
                  src="/GGClogo.png"
                  alt="GGC"
                  width={24}
                  height={24}
                  className={styles.logoIcon}
                />
                <span>Connected Accounts</span>
                <button onClick={() => setShowModal(false)}>
                  <X className="h-5 w-5 text-light" />
                </button>
              </div>

              <ul className={styles.addressList}>
                {accounts.map(addr => (
                  <li key={addr}>
                    <div
                      onClick={() => {
                        selectAccount(addr);
                        setShowModal(false);
                      }}
                      className={`${styles.addressItem} ${
                        addr === account ? styles.active : ''
                      }`}
                    >
                      {addr.slice(0, 6)}...{addr.slice(-4)}
                    </div>
                  </li>
                ))}
              </ul>

              <button
                className={styles.disconnectBtn}
                onClick={() => {
                  disconnect();
                  setShowModal(false);
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
