'use client';
import React from 'react';
import { useWallet } from '../hooks/useWallet';
import UserDashboard from '../components/UserDashboard';
import { isOwner } from '../utils/ethers';
import ConnectWalletButton from '../components/ConnectWalletButton';

export default function HomePage() {
  const { account, isConnecting } = useWallet();
  const [ownerStatus, setOwnerStatus] = React.useState<boolean>(false);
  const [loadingOwner, setLoadingOwner] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;

    async function checkOwner() {
      if (!account) {
        if (mounted) {
          setLoadingOwner(false);
        }
        return;
      }
      console.log('Checking owner status for account:', account);
      const owner = await isOwner(account);
      console.log('Owner status:', owner);
      if (mounted) {
        setOwnerStatus(owner);
        setLoadingOwner(false);
      }
    }
    checkOwner();

    return () => {
      mounted = false;
    };
  }, [account]);

  if (isConnecting) {
    return (
      <div className="mt-24 text-center text-light">
        Connecting to wallet...
      </div>
    );
  }

  if (!account) {
    return (
      <div className="mt-24 flex flex-col items-center space-y-4">
        <div className="text-center text-light">
          Please connect your wallet to see your allocation.
        </div>
        <ConnectWalletButton />
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