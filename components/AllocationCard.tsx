'use client';
import React from 'react';
import dayjs from 'dayjs';
import { initEthers } from '../utils/ethers';

interface AllocationProps {
  total: string;
  tgeUnlock: string;
  cliffMonths: number;
  vestingMonths: number;
  claimed: string;
  startTimestamp: number;
}

function formatWei(wei: string) {
  const length = wei.length;
  if (length <= 18) return '0.' + '0'.repeat(18 - length) + wei;
  const integer = wei.slice(0, length - 18);
  const fraction = wei.slice(length - 18, length - 18 + 4);
  return integer + '.' + fraction;
}

const AllocationCard: React.FC<AllocationProps> = ({ total, tgeUnlock, cliffMonths, vestingMonths, claimed, startTimestamp }) => {
  const { contract } = initEthers();

  const handleClaim = async () => {
    try {
      if (!contract) throw new Error('Contract not initialized');
      const tx = await contract.claim();
      await tx.wait();
      alert('Claim successful!');
    } catch (e: any) {
      alert(e.message || 'Claim failed');
    }
  };

  return (
    <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-700">
      <h3 className="text-xl text-gold font-semibold mb-4">Your Allocation</h3>
      <div className="space-y-2">
        <div>
          <span className="font-medium text-light">Total Allocated:</span>{' '}
          <span className="text-light">{formatWei(total)} GGC</span>
        </div>
        <div>
          <span className="font-medium text-light">TGE Unlock:</span>{' '}
          <span className="text-light">{formatWei(tgeUnlock)} GGC</span>
        </div>
        <div>
          <span className="font-medium text-light">Cliff Period:</span>{' '}
          <span className="text-light">{cliffMonths} month(s)</span>
        </div>
        <div>
          <span className="font-medium text-light">Vesting Period:</span>{' '}
          <span className="text-light">{vestingMonths} month(s)</span>
        </div>
        <div>
          <span className="font-medium text-light">Claimed:</span>{' '}
          <span className="text-light">{formatWei(claimed)} GGC</span>
        </div>
        <div>
          <span className="font-medium text-light">Start Date:</span>{' '}
          <span className="text-light">{dayjs.unix(startTimestamp).format('MMMM D, YYYY')}</span>
        </div>
      </div>
      <button
        className="mt-6 px-4 py-2 bg-gold text-dark rounded-lg font-semibold hover:scale-105 transform transition"
        onClick={handleClaim}
      >
        Claim Tokens
      </button>
    </div>
  );
};

export default AllocationCard;