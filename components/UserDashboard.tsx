'use client';
import React, { useEffect, useState } from 'react';
import { getAllocation, getBalance } from '../utils/ethers';
import AllocationCard from './AllocationCard';

const UserDashboard: React.FC<{ account: string }> = ({ account }) => {
  const [allocation, setAllocation] = useState<any>(null);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    async function fetchData() {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        // Add timeout to prevent hanging requests
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setError('Request timeout');
            setLoading(false);
          }
        }, 30000); // 30 second timeout

        const alloc = await getAllocation(account);
        if (!isMounted) return;
        console.log('Fetched allocation:', alloc);
        setAllocation(alloc);

        const bal = await getBalance(account);
        if (!isMounted) return;
        setBalance(bal);
      } catch (e: any) {
        if (isMounted) {
          setError(e.message || 'Failed to fetch allocation');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    }

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [account]);

  if (loading) {
    return <div className="mt-24 text-center text-light">Loading your data...</div>;
  }
  if (error) {
    return <div className="mt-24 text-center text-red-500">{error}</div>;
  }
  if (!allocation || allocation.total === '0') {
    return (
      <div className="mt-24 text-center text-light">
        You have no allocation.
      </div>
    );
  }
  return (
    <div className="mt-24 flex flex-col items-center space-y-8">
      <AllocationCard {...allocation} />
      <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-700 w-full max-w-md text-center">
        <span className="font-medium text-light">Your GGC Balance:</span>{' '}
        <span className="text-light font-semibold">{parseFloat((parseInt(balance) / 1e18).toFixed(4))} GGC</span>
      </div>
    </div>
  );
};

export default UserDashboard;