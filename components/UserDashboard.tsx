'use client';

import React, { useEffect, useState } from 'react';
import styles from './UserDashboard.module.css';
import {
  getAllocation,
  getBalance,
  getAddressChangeApproved,
  approveAddressChange,
  revokeAddressChangeApproval,
} from '../utils/ethers';
import {AllocationCard} from './AllocationCard';
import { useWallet } from '../context/WalletContext';
import { ArrowRightLeft, XOctagon } from 'lucide-react';

export default function UserDashboard() {
  const { account, chainId } = useWallet();
  const [allocation, setAllocation] = useState<any>(null);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
     // if user disconnected or no account yet, clear state
     if (!account) {
      setAllocation(null);
      setBalance('0');
      return;
    }

   // If on the wrong network, show a friendly message and DON'T call getAllocation()
   if (chainId !== 1329) {
     setError('Please switch to the Sei network to view your allocation.');
     setLoading(false);
     return;
   }

    // console.log('🔄 Detected account change, refetching for', account);

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    async function fetchData(account: string) {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      timeoutId = setTimeout(() => {
        if (isMounted) {
          setError('Request timeout – please refresh.');
          setLoading(false);
        }
      }, 60000);

      try {
        const alloc = await getAllocation(account);
        if (!isMounted) return;
        setAllocation(alloc);

        const bal = await getBalance(account);
        if (!isMounted) return;
        setBalance(bal);

        // → also fetch addressChangeApproved
        const approved = await getAddressChangeApproved(account);
        if (!isMounted) return; 
        setIsApproved(approved);

      } catch (e: any) {
              // Normalize the error code
    const code = e.code as string;
    // 1) User rejected in wallet
    if (code === 'ACTION_REJECTED') {
      alert('Transaction Rejected');
      return;
    }
        if (isMounted) setError(e.message || 'Failed to fetch data');
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    }

    fetchData(account);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [account]);

    // Handlers
    const handleToggleApproval = async () => {
      setActionLoading(true);
      try {
        if (isApproved) {
          if (account) {
            await revokeAddressChangeApproval(account);
          } else {
            // console.error('Account is null, cannot revoke address change approval.');
            alert('Account is null, cannot revoke address change approval.');
          }
          setIsApproved(false);
        } else {
          if (account) {
            await approveAddressChange(account);
          } else {
            // console.error('Account is null, cannot approve address change.');
            alert('Account is null, cannot approve address change.');
          }
          setIsApproved(true);
        }
      } catch (e: any) {
              // Normalize the error code
    const code = e.code as string;
    // 1) User rejected in wallet
    if (code === 'ACTION_REJECTED') {
      alert('Transaction Rejected');
      return;
    }
        // console.error(e);
        alert(e.message || 'Transaction failed');
      } finally {
        setActionLoading(false);
      }
    };

  if (loading) return <p className="text-center mt-24">Loading your data…</p>;
  if (error)
    return (
      <div className="text-center mt-24">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gold text-dark rounded-lg font-semibold hover:scale-105 transition"
        >
          Refresh
        </button>
      </div>
    );
    if (!allocation || allocation.total === '0') {
      return (
        <img
          src="/NO.png"
          alt="No allocation"
          className="mx-auto mt-20 w-lg h-lg"
        />
      );
    }

  const humanBalance = parseFloat((parseInt(balance) / 1e18).toFixed(4));

  return (
    <div className={styles.wrapper}>
      <div className={styles.root}>
        <div className={styles.bg} />

        <div className={styles.allocationFrame}>
          <AllocationCard {...allocation} />
        </div>

        <div className={styles.balanceFrame}>
          <div className={styles.balancePopup} />
          <h3 className={styles.balanceTitle}>$GGC BALANCE</h3>
          <div className={styles.walletTextBar}>{humanBalance} GGC</div>
        </div>
      </div>
      {/* Floating Grant/Revoke button */}
      <div className="fixed bottom-6 right-20 z-50">
  <div className="group relative inline-block">
    <button
      onClick={handleToggleApproval}
      disabled={actionLoading}
      aria-label={isApproved ? 'Revoke migration permission' : 'Grant migration permission'}
      className={`
        w-16 h-16 rounded-full
        bg-gradient-to-br from-blue-600 to-indigo-500
        shadow-2xl text-white flex items-center justify-center
        focus:outline-none focus:ring-4 focus:ring-indigo-300
        transition-transform
        ${actionLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-110'}
      `}
    >
      {actionLoading ? (
        <svg
          className="animate-spin w-6 h-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : isApproved ? (
        <XOctagon size={28} />
      ) : (
        <ArrowRightLeft size={28} />
      )}
    </button>

    {/* Tooltip on hover */}
    <div
      className="
        absolute bottom-full mb-2
        left-0
        sm:left-1/2 sm:-translate-x-1/2 sm:transform
        hidden group-hover:flex group-focus:flex
        z-50
      "
    >
      <div
        className="
          h-8 px-3 flex items-center justify-center
          max-w-xs
          whitespace-nowrap
          bg-no-repeat bg-center
          bg-[url('/Popup-1.png')]
          bg-[length:100%_100%]
        "
      >
         <span className="text-xs text-gray-800">
          {actionLoading
            ? 'Processing…'
            : isApproved
            ? 'Revoke address migration permission'
            : 'Grant address migration permission'}
        </span>
      </div>
    </div>
  </div>
      </div>
  </div>
  );
}