'use client';
import React from 'react';
import { useWallet } from '../hooks/useWallet';
import UserDashboard from '../components/UserDashboard';
import { isOwner } from '../utils/ethers';

export default function HomePage() {
  const { account } = useWallet();
  const [ownerStatus, setOwnerStatus] = React.useState<boolean>(false);
  const [loadingOwner, setLoadingOwner] = React.useState<boolean>(true);

  React.useEffect(() => {
    async function checkOwner() {
      if (!account) {
        setLoadingOwner(false);
        return;
      }
      console.log('Checking owner status for account:', account);
      const owner = await isOwner(account);
      console.log('Owner status:', owner);
      setOwnerStatus(owner);
      setLoadingOwner(false);
    }
    checkOwner();
  }, [account]);

  if (!account) {
    return (
      <div className="mt-24 text-center text-light">
        Please connect your wallet to see your allocation.
      </div>
    );
  }

  if (loadingOwner) {
    return (
      <div className="mt-24 text-center text-light">Checking permissions...</div>
    );
  }

  if (ownerStatus) {
    return (
      <div className="mt-24 text-center text-light">
        This is the <strong>Owner</strong> account. Navigate to{' '}
        <a href="/owner" className="text-gold underline">
          Owner Panel
        </a>
        .
      </div>
    );
  }

  return <UserDashboard account={account} />;
}