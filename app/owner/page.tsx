'use client';

import React from 'react';
import { useWallet } from '../../context/WalletContext';
import OwnerDashboard from '../../components/OwnerDashboard';
import ConnectWalletButton from '../../components/ConnectWalletButton';
import { isOwner, isAirdropOwner } from '../../utils/ethers';

export default function OwnerPage() {
  const { account, isConnecting } = useWallet();
  const [allowed, setAllowed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function check() {
      if (!account) {
        if (mounted) setLoading(false);
        return;
      }
      const [mainOk, airOk] = await Promise.all([
        isOwner(account),
        isAirdropOwner(account),
      ]);
      if (mounted) {
        setAllowed(mainOk || airOk);
        setLoading(false);
      }
    }
    check();
    return () => { mounted = false; };
  }, [account]);

  if (isConnecting) {
    return <div className="mt-24 text-center">Connecting wallet…</div>;
  }
  if (!account) {
    return (
      <div className="mt-24 text-center">
        <p>Please connect your wallet to access the Owner Panel.</p>
        <ConnectWalletButton />
      </div>
    );
  }
  if (loading) {
    return <div className="mt-24 text-center">Verifying permissions…</div>;
  }
  if (!allowed) {
    return <div className="mt-24 text-center text-red-500">Access denied</div>;
  }

  return <OwnerDashboard account={account} />;
}
