'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { initEthers } from '../utils/ethers';
import { ethers } from 'ethers';

interface FormValues {
  beneficiary: string;
  totalAmount: string;
  tgePercent: number;
  cliffMonths: number;
  vestingMonths: number;
  claimPerSecond: string; // decimal GGC/s
  lookupAddress: string;
  oldAddress: string;
  newAddress: string;
  withdrawAddress: string;
}

const OwnerDashboard: React.FC<{ account: string }> = ({ account }) => {
  const { contract } = initEthers();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<FormValues>();

  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  // 1) Set Allocation
  const onSubmit = async (data: FormValues) => {
    setFormError(null);
    try {
      // Parse totalAmount (GGC tokens) → wei
      const totalWei = ethers.utils.parseUnits(data.totalAmount, 18);

      const tgePercent = data.tgePercent;
      const cliff = data.cliffMonths;
      const vesting = data.vestingMonths;

      // Parse claimPerSecond (decimal GGC/s) → wei/s
      const cpsWei = ethers.utils.parseUnits(data.claimPerSecond, 18);

      // Use the current UNIX timestamp (seconds)
      const startTs = Math.floor(Date.now() / 1000);

      const tx = await contract.setAllocation(
        data.beneficiary,
        totalWei,
        tgePercent,
        cliff,
        vesting,
        cpsWei,
        startTs
      );
      const receipt = await tx.wait();
      setTxHash(receipt.transactionHash);

      reset({
        beneficiary: '',
        totalAmount: '',
        tgePercent: 0,
        cliffMonths: 0,
        vestingMonths: 0,
        claimPerSecond: '',
        lookupAddress: '',
        oldAddress: '',
        newAddress: '',
        withdrawAddress: ''
      });
    } catch (e: any) {
      setFormError(e.reason || e.message);
    }
  };

  // 2) Lookup Allocation
  const handleLookup = async () => {
    setLookupError(null);
    try {
      const addr = watch('lookupAddress');
      const alloc = await contract.allocations(addr);
      setLookupResult({
        total: alloc.total.toString(),
        tgeUnlock: alloc.tgeUnlock.toString(),
        cliffMonths: alloc.cliffMonths.toNumber(),
        vestingMonths: alloc.vestingMonths.toNumber(),
        claimPerSecond: alloc.claimPerSecond.toString(),
        claimed: alloc.claimed.toString(),
        startTimestamp: alloc.startTimestamp.toNumber()
      });
    } catch {
      setLookupError('No allocation found or invalid address');
      setLookupResult(null);
    }
  };

  // 3) Change Address
  const handleChangeAddress = async () => {
    setChangeError(null);
    const oldAddr = watch('oldAddress');
    const newAddr = watch('newAddress');
    try {
      const tx = await contract.changeAddress(oldAddr, newAddr);
      await tx.wait();
      alert('Address updated successfully');
      reset({
        ...watch(),
        oldAddress: '',
        newAddress: ''
      });
    } catch (e: any) {
      setChangeError(e.reason || e.message);
    }
  };

  // 4) Emergency Withdraw
  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const toAddr = watch('withdrawAddress');
      const tx = await contract.emergencyWithdraw(toAddr);
      await tx.wait();
      alert('Emergency withdrawal successful');
    } catch (e: any) {
      alert(e.reason || e.message);
    }
    setWithdrawing(false);
    setDropdownOpen(false);
  };

  return (
    <div className="mt-24 px-8 max-w-3xl mx-auto space-y-12">
      <h2 className="text-3xl text-gold font-bold text-center">Owner Panel</h2>

      {/* 1) Set Allocation Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-700"
      >
        <h3 className="text-2xl text-light font-semibold mb-6">Set New Allocation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Beneficiary Address */}
          <div>
            <label className="block text-sm font-medium text-light mb-1">
              Beneficiary Address
            </label>
            <input
              {...register('beneficiary', { 
                required: true, 
                pattern: /^0x[a-fA-F0-9]{40}$/ 
              })}
              className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="0x..."
            />
            {errors.beneficiary && (
              <span className="text-red-500 text-xs">
                Valid Ethereum address is required
              </span>
            )}
          </div>

          {/* Total Amount (GGC) */}
          <div>
            <label className="block text-sm font-medium text-light mb-1">
              Total Amount (GGC)
            </label>
            <input
              {...register('totalAmount', { required: true })}
              type="text"
              placeholder="e.g. 1000000"
              className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
            />
            {errors.totalAmount && (
              <span className="text-red-500 text-xs">
                Enter total tokens (no decimals)
              </span>
            )}
          </div>

          {/* TGE % */}
          <div>
            <label className="block text-sm font-medium text-light mb-1">TGE %</label>
            <div className="relative">
              <input
                {...register('tgePercent', {
                  required: true,
                  min: 0,
                  max: 100
                })}
                type="number"
                min={0}
                max={100}
                className="w-full pl-3 pr-10 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-light">
                %
              </span>
            </div>
            {errors.tgePercent && (
              <span className="text-red-500 text-xs">0–100 % required</span>
            )}
          </div>

          {/* Cliff Months */}
          <div>
            <label className="block text-sm font-medium text-light mb-1">
              Cliff Months
            </label>
            <div className="relative">
              <input
                {...register('cliffMonths', { required: true, min: 0 })}
                type="number"
                min={0}
                className="w-full pl-3 pr-16 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-light">
                month(s)
              </span>
            </div>
            {errors.cliffMonths && (
              <span className="text-red-500 text-xs">Enter non-negative months</span>
            )}
          </div>

          {/* Vesting Months */}
          <div>
            <label className="block text-sm font-medium text-light mb-1">
              Vesting Months
            </label>
            <div className="relative">
              <input
                {...register('vestingMonths', { required: true, min: 1 })}
                type="number"
                min={1}
                className="w-full pl-3 pr-16 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-light">
                month(s)
              </span>
            </div>
            {errors.vestingMonths && (
              <span className="text-red-500 text-xs">At least 1 month</span>
            )}
          </div>

          {/* Claim Per Second */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-light mb-1">
              Claim Per Second (GGC)
            </label>
            <input
              {...register('claimPerSecond', { required: true })}
              type="text"
              placeholder="e.g. 4.65"
              className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
            />
            {errors.claimPerSecond && (
              <span className="text-red-500 text-xs">
                Enter a decimal token rate (e.g. 4.65)
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="mt-6 px-6 py-3 bg-gold text-dark rounded-xl font-semibold hover:scale-105 transform transition"
        >
          Submit Allocation
        </button>

        {/* Error message if contract call fails */}
        {formError && <div className="mt-4 text-red-500">{formError}</div>}

        {/* Show transaction hash if successful */}
        {txHash && (
          <div className="mt-4 text-gold">
            Allocation submitted! TxHash:{' '}
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          </div>
        )}
      </form>

      {/* 2) Lookup Allocation by Address */}
      <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-700 space-y-4">
        <h3 className="text-2xl text-light font-semibold">Lookup Allocation</h3>
        <div className="flex space-x-4">
          <input
            {...register('lookupAddress', { pattern: /^0x[a-fA-F0-9]{40}$/ })}
            type="text"
            placeholder="0xUserAddress"
            className="flex-grow px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <button
            type="button"
            className="px-4 py-2 bg-gold text-dark rounded-lg hover:scale-105 transform transition"
            onClick={handleLookup}
          >
            Lookup
          </button>
        </div>
        {lookupError && <div className="text-red-500">{lookupError}</div>}
        {lookupResult && (
          <div className="mt-4">
            <h4 className="text-xl text-gold font-medium">Result:</h4>
            <pre className="bg-gray-700 p-4 rounded-lg overflow-x-auto">
{JSON.stringify(
  {
    total: lookupResult.total,
    tgeUnlock: lookupResult.tgeUnlock,
    cliffMonths: lookupResult.cliffMonths,
    vestingMonths: lookupResult.vestingMonths,
    claimPerSecond: lookupResult.claimPerSecond,
    claimed: lookupResult.claimed,
    startDate: new Date(lookupResult.startTimestamp * 1000).toLocaleDateString()
  },
  null,
  2
)}
            </pre>
          </div>
        )}
      </div>

      {/* 3) Change Address */}
      {/* <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-700 space-y-4">
        <h3 className="text-2xl text-light font-semibold">Change Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-light mb-1">Old Address</label>
            <input
              {...register('oldAddress', { required: true, pattern: /^0x[a-fA-F0-9]{40}$/ })}
              type="text"
              className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="0xOldAddress"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-light mb-1">New Address</label>
            <input
              {...register('newAddress', { required: true, pattern: /^0x[a-fA-F0-9]{40}$/ })}
              type="text"
              className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="0xNewAddress"
            />
          </div>
        </div>
        <button
          type="button"
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:scale-105 transform transition"
          onClick={handleChangeAddress}
        >
          Update Address
        </button>
        {changeError && <div className="mt-2 text-red-500">{changeError}</div>}
      </div> */}

      {/* 4) Emergency Withdraw Dropdown */}
      <div className="relative">
        <button
          type="button"
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none"
          onClick={() => setDropdownOpen((prev) => !prev)}
        >
          Emergency Actions
          <svg
            className="ml-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700">
            <div className="px-4 py-3">
              <label className="block text-sm font-medium text-light mb-1">
                Withdraw To Address
              </label>
              <input
                {...register('withdrawAddress', { required: true, pattern: /^0x[a-fA-F0-9]{40}$/ })}
                type="text"
                placeholder="0xWithdrawAddress"
                className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                className="mt-4 w-full px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:scale-105 transform transition"
                onClick={handleWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? 'Withdrawing...' : 'Perform Emergency Withdraw'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
