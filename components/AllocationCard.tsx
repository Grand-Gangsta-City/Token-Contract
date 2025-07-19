// export default AllocationCard;
'use client';

import React, { useState } from 'react';
import dayjs from 'dayjs';
import styles from './AllocationCard.module.css';
// import { initEthers } from '../utils/ethers';
import { getContract } from '../utils/ethers';
import { useWallet } from '../context/WalletContext';

type ErrorType = 'nothing' | 'rejected' | 'failed';

interface AllocationProps {
  total: string;
  tgeUnlock: string;
  cliffMonths: number;
  vestingMonths: number;
  claimed: string;
  startTimestamp: number;
}

function formatWei(wei: string) {
  const len = wei.length;
  if (len <= 18) return '0.' + '0'.repeat(18 - len) + wei;
  return wei.slice(0, len - 18) + '.' + wei.slice(len - 18, len - 14);
}

export function AllocationCard({
  total,
  tgeUnlock,
  cliffMonths,
  vestingMonths,
  claimed,
  startTimestamp,
}: AllocationProps) {
  const { account } = useWallet();
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorType, setErrorType] = useState<ErrorType | null>(null);

  const handleClaim = async () => {
    try {
      const contract = await getContract(account || undefined);
      if (!contract) throw new Error('Contract not ready');
      const tx = await contract.claim();
      await tx.wait();
      alert('Claim successful!');
    } catch (e: any) {
      // console.error(e?.data?.message || e.message);
       // Normalize the error code
    const code = e.code as string;
    // 1) User rejected in wallet
    if (code === 'ACTION_REJECTED') {
      setErrorType('rejected');
      alert('Transaction Rejected');
      return;
    }
      setShowErrorPopup(true);
    }
  };

  const fields = [
    { label: 'Total Allocation', value: `${formatWei(total)} GGC`, top: 85 },
    { label: 'TGE Unlock', value: `${formatWei(tgeUnlock)} GGC`, top: 183 },
    { label: 'Cliff Period', value: `${cliffMonths} month(s)`, top: 283 },
    { label: 'Vesting Period', value: `${vestingMonths} month(s)`, top: 383 },
    { label: 'Claimed', value: `${formatWei(claimed)} GGC`, top: 483 },
    { label: 'Start Date', value: dayjs.unix(startTimestamp).format('MMMM D, YYYY'), top: 583 },
  ];

  return (
    <>
    <div className={styles.root}>
      <div className={styles.popup} />
      <h3 className={styles.title}>Your Allocation</h3>
      {fields.map(({ label, value, top }) => (
        <div
          key={label}
          className={styles.field}
          style={{ top: `${top}px` }}
        >
          <div className={styles.fieldBg} />
          <span className={styles.fieldLabel}>{label}</span>
          <span className={styles.fieldValue}>{value}</span>
        </div>
      ))}
      <div className={styles.claimButtonWrapper}>
        <div className='hover:scale-105'>
        <div className={styles.claimButtonBg} />
        <button className={styles.claimButtonText} onClick={handleClaim}>
          CLAIM TOKENS
        </button>
      </div>
    </div>
    </div>
    {showErrorPopup && (
      <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
        <div
          className="relative w-2xl h-108 bg-cover bg-center rounded-xl"
          style={{ backgroundImage: "url('/BG.png')" }}
        >
          <button
            onClick={() => setShowErrorPopup(false)}
            className="absolute top-2 right-2 p-2 text-white text-3xl cursor-pointer"
          >
            &times;
          </button>
          </div>

          <div>
          <img
            src="/claimed-bg.png" 
            alt="Nothing to claim"
            className="absolute inset-0 m-auto w-xl h-xl"
          />
        </div>
      </div>
    )}
    </>
  );
}