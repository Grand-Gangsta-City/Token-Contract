'use client';
import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import OwnerDashboard from '../../components/OwnerDashboard';
import { isOwner } from '../../utils/ethers';

export default function OwnerPage() {
  const { account } = useWallet();
  const [ownerStatus, setOwnerStatus] = React.useState<boolean>(false);
  const [loadingOwner, setLoadingOwner] = React.useState<boolean>(true);

  React.useEffect(() => {
    async function checkOwner() {
      if (!account) {
        setLoadingOwner(false);
        return;
      }
      const owner = await isOwner(account);
      setOwnerStatus(owner);
      setLoadingOwner(false);
    }
    checkOwner();
  }, [account]);

  if (!account) {
    return (
      <div className="mt-24 text-center text-light">
        Please connect your wallet to access the Owner Panel.
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