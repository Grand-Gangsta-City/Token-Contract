'use client';
import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import OwnerDashboard from '../../components/OwnerDashboard';
import { isOwner } from '../../utils/ethers';
import ConnectWalletButton from '../../components/ConnectWalletButton';

export default function OwnerPage() {
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
      const owner = await isOwner(account);
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
          Please connect your wallet to access the Owner Panel.
        </div>
        <ConnectWalletButton />
      </div>
    );
  }

  if (loadingOwner) {
    return (
      <div className="mt-24 text-center text-light">Verifying owner status...</div>
    );
  }

  if (!ownerStatus) {
    return (
      <div className="mt-24 text-center text-red-500">Access Denied. You are not the owner.</div>
    );
  }

  return <OwnerDashboard account={account} />;
}