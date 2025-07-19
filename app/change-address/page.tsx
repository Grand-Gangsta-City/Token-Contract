// File: app/change-address/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
// import { initEthers } from '../../utils/ethers';
import { getContract, getSigner, getProvider } from '../../utils/ethers';
import { ethers } from 'ethers';
import { useForm } from 'react-hook-form';
import { useWallet } from '../../context/WalletContext';

interface ChangeForm {
  oldAddress: string;
  newAddress: string;
}

export default function ChangeAddressPage() {
  
  // const [account, setAccount] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);
  const { account, isConnecting } = useWallet();
  
 
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangeForm>({
    defaultValues: {
      oldAddress: '',
      newAddress: '',
    },
  });

  // Fetch current connected account and check owner status
  useEffect(() => {

    if (!account) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

    async function checkOwner() {
      // console.log('Checking owner status for account:', account);
      const provider = getProvider();
      const contract = await getContract(account || undefined);
      if (!provider) {
        setLoading(false);
        return;
      }
      try {
        
        const contractOwner: string = await contract.owner();
        // console.log('Contract owner:', contractOwner);
        setIsAdmin(account?.toLowerCase() === contractOwner.toLowerCase());
      } catch {
        setIsAdmin(false);
      }
      setLoading(false);
    }
    checkOwner();
  }, [account]);

  const onChangeAddress = async (data: ChangeForm) => {
    const contract = await getContract(account || undefined);
    setChangeError(null);
    setChangeSuccess(null);

    if (!contract) {
      setChangeError('Ethereum provider not found.');
      return;
    }

    const { oldAddress, newAddress } = data;
    if (!/^0x[a-fA-F0-9]{40}$/.test(oldAddress)) {
      setChangeError('Old address is not a valid Ethereum address.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAddress)) {
      setChangeError('New address is not a valid Ethereum address.');
      return;
    }

    try {
      const tx = await contract.changeAddress(oldAddress, newAddress);
      const receipt = await tx.wait();
      setChangeSuccess(`Address changed. TxHash: ${receipt.transactionHash}`);
    } catch (err: any) {
      setChangeError(err.reason || err.message);
    }
  };

  if (loading) {
    return (
      <div className="mt-24 text-center text-light">
        Checking permissions...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mt-24 text-center text-red-500">
        Access denied. Only the contract owner can view this page.
      </div>
    );
  }

  return (
    <div className="mt-24 px-8 max-w-lg mx-auto">
      

      <form
        onSubmit={handleSubmit(onChangeAddress)}
        style={{ background: "url('/Popup-1.png') no-repeat center/cover" }}
        className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-700"
      >
        <h2 className="text-xl uppercase text-black font-bold text-center mb-8">
        Change Allocation Address
      </h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-black mb-1">
            Old Address
          </label>
          <input
            {...register('oldAddress', {
              required: 'Old address is required',
              pattern: {
                value: /^0x[a-fA-F0-9]{40}$/,
                message: 'Invalid Ethereum address format',
              },
            })}
            type="text"
            placeholder="0xOldAddress"
            style={{ background: "url('/Text-Field.png') no-repeat center/cover" }}
            className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
          />
          {errors.oldAddress && (
            <p className="text-red-500 text-xs mt-1">
              {errors.oldAddress.message}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-black mb-1">
            New Address
          </label>
          <input
            {...register('newAddress', {
              required: 'New address is required',
              pattern: {
                value: /^0x[a-fA-F0-9]{40}$/,
                message: 'Invalid Ethereum address format',
              },
            })}
            type="text"
            placeholder="0xNewAddress"
            style={{ background: "url('/Text-Field.png') no-repeat center/cover" }}
            className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
          />
          {errors.newAddress && (
            <p className="text-red-500 text-xs mt-1">
              {errors.newAddress.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:scale-105 transform transition"
          style={{ background: "url('/Brows-File-Button-Plain.png') no-repeat center/cover" }}
        >
          Change Address
        </button>

        {changeError && (
          <div className="mt-4 text-red-500 text-sm">{changeError}</div>
        )}
        {changeSuccess && (
          <div className="mt-4 text-green-400 text-sm">{changeSuccess}</div>
        )}
      </form>
    </div>
  );
};
