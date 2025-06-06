'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { initEthers, getCategoryInfo, getAllocation } from '../utils/ethers';
import { ethers } from 'ethers';
import * as XLSX from 'xlsx'; // npm install xlsx
import AllocationCard from './AllocationCard';

interface FormValues {
  category: number;
  beneficiariesRaw: string;
  amountsRaw: string;
  oldAddress: string;
  newAddress: string;
}

const CATEGORY_LABELS = [
  'Seed',
  'Private',
  'Strategic',
  'Public',
  'Team',
  'Advisors',
  'Marketing',
  'Airdrop',
  'Reserve',
  'Liquidity',
  'Rewards',
  'Development'
];

const OwnerDashboard: React.FC<{ account: string }> = ({ account }) => {
  const { contract } = initEthers();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      category: 0,
      beneficiariesRaw: '',
      amountsRaw: '',
      oldAddress: '',
      newAddress: ''
    }
  });

  const [categoryInfo, setCategoryInfo] = useState<{
    totalAmount: string;
    tgePercent: number;
    cliffMonths: number;
    vestingMonths: number;
    allocated: string;
    usesPerMille: boolean;
  } | null>(null);

  const [categoryPercentUsed, setCategoryPercentUsed] = useState<number>(0);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);

  const [lookupAddress, setLookupAddress] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const selectedCategory = watch('category');

  // Load category info whenever selection changes
  useEffect(() => {
    async function loadCategory() {
      const info = await getCategoryInfo(selectedCategory);
      if (info) {
        setCategoryInfo(info);
        if (info.totalAmount !== '0') {
          const allocatedBN = ethers.BigNumber.from(info.allocated);
          const totalBN = ethers.BigNumber.from(info.totalAmount);
          const pctTimes100 = allocatedBN.mul(10000).div(totalBN).toNumber();
          setCategoryPercentUsed(pctTimes100 / 100);
        } else {
          setCategoryPercentUsed(0);
        }
      } else {
        setCategoryInfo(null);
        setCategoryPercentUsed(0);
      }
    }
    loadCategory();
  }, [selectedCategory]);

  // Parse comma-separated addresses + amounts
  function parseRawInputs(rawAddrs: string, rawAmts: string) {
    const addrs = rawAddrs
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const amts = rawAmts
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => Number(s));
    if (addrs.length !== amts.length) {
      throw new Error('Addresses and amounts count must match');
    }
    addrs.forEach(addr => {
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    });
    amts.forEach(n => {
      if (isNaN(n) || n <= 0) {
        throw new Error(`Invalid amount: ${n}`);
      }
    });
    return { addresses: addrs, amounts: amts };
  }

  // 1) Manual allocation via CSV
  const onSubmit = async (data: FormValues) => {
    setParsingError(null);
    setTxHash(null);

    if (!contract) {
      setParsingError('Wallet not connected');
      return;
    }

    let parsed;
    try {
      parsed = parseRawInputs(data.beneficiariesRaw, data.amountsRaw);
    } catch (err: any) {
      setParsingError(err.message);
      return;
    }

    const catIndex = data.category;
    try {
      const tx = await contract.allocateBatch(
        catIndex,
        parsed.addresses,
        parsed.amounts
      );
      const receipt = await tx.wait();
      setTxHash(receipt.transactionHash);
      setValue('beneficiariesRaw', '');
      setValue('amountsRaw', '');
    } catch (e: any) {
      setParsingError(e.reason || e.message);
    }
  };

  // 2) Excel upload handler
  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setTxHash(null);
  
    if (!contract) {
      setUploadError('Wallet not connected');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) {
      setUploadError('No file chosen');
      return;
    }
  
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        // Excel → JSON: each row should have “address” & “amount”
        const jsonArr: Array<{ address: string; amount: string | number }> =
          XLSX.utils.sheet_to_json(ws);
  
        const addresses: string[] = [];
        const amounts: number[] = [];
        for (const row of jsonArr) {
          const addr = (row as any).address?.toString().trim();
          // Treat amount cell as string or number
          const rawAmt = (row as any).amount;
          if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
            throw new Error(`Invalid address in row: ${JSON.stringify(row)}`);
          }
          const parsed = Number(rawAmt);
          if (isNaN(parsed) || parsed <= 0) {
            throw new Error(`Invalid amount in row: ${JSON.stringify(row)}`);
          }
          // **Force‐round down to an integer** before pushing
          // (the contract expects a whole‐token count, not a decimal).
          const amtNum = Math.floor(parsed);
          addresses.push(addr);
          amounts.push(amtNum);
        }
        if (addresses.length === 0) {
          throw new Error('Excel must contain at least one row');
        }
  
        const catIndex = watch('category');
        const tx = await contract.allocateBatch(catIndex, addresses, amounts);
        const receipt = await tx.wait();
        setTxHash(receipt.transactionHash);
        (e.target as HTMLInputElement).value = '';
      } catch (err: any) {
        setUploadError(err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 3) Change Address handler
  const handleChangeAddress = async () => {
    setChangeError(null);
    setChangeSuccess(null);

    if (!contract) {
      setChangeError('Wallet not connected');
      return;
    }
    const oldAddr = watch('oldAddress');
    const newAddr = watch('newAddress');

    if (!/^0x[a-fA-F0-9]{40}$/.test(oldAddr)) {
      setChangeError('Invalid old address');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAddr)) {
      setChangeError('Invalid new address');
      return;
    }

    try {
      const tx = await contract.changeAddress(oldAddr, newAddr);
      const receipt = await tx.wait();
      setChangeSuccess(`Address updated! TxHash: ${receipt.transactionHash}`);
      setValue('oldAddress', '');
      setValue('newAddress', '');
    } catch (e: any) {
      setChangeError(e.reason || e.message);
    }
  };

  // 4) Lookup Allocation handler
  const handleLookup = async () => {
    setLookupError(null);
    setLookupResult(null);

    if (!contract) {
      setLookupError('Wallet not connected');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(lookupAddress)) {
      setLookupError('Invalid address format');
      return;
    }
    try {
      const alloc = await getAllocation(lookupAddress);
      if (!alloc || alloc.total === '0') {
        setLookupError('No allocation found');
        return;
      }
      setLookupResult(alloc);
    } catch {
      setLookupError('Failed to fetch allocation');
    }
  };

  return (
    <div className="mt-24 px-8 max-w-2xl mx-auto space-y-12">
      <h2 className="text-3xl text-gold font-bold text-center">Owner Panel</h2>

      {/* ───────────────────────────────────────────────────────────────
                1) Category‐Based Allocation Form (Manual CSV entry)
      ─────────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-700"
      >
        <h3 className="text-2xl text-light font-semibold mb-6">
          Allocate from a Category
        </h3>

        {/* Category Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-light mb-1">
            Select Category
          </label>
          <select
            {...register('category', { required: true })}
            className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
          >
            {CATEGORY_LABELS.map((label, idx) => (
              <option key={idx} value={idx}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Show “% already allocated” */}
        {categoryInfo && (
          <div className="mb-6 text-sm text-light">
            <strong>Category “{CATEGORY_LABELS[selectedCategory]}” Usage:</strong>{' '}
            {categoryPercentUsed.toFixed(2)}% (
            {ethers.utils.formatUnits(categoryInfo.allocated, 18)} /{' '}
            {ethers.utils.formatUnits(categoryInfo.totalAmount, 18)} GGC)
          </div>
        )}

        {/* Addresses (CSV) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-light mb-1">
            Beneficiary Addresses (comma-separated)
          </label>
          <input
            {...register('beneficiariesRaw', { required: true })}
            type="text"
            placeholder="0x123…, 0x456…, 0x789…"
            className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
          />
          {errors.beneficiariesRaw && (
            <span className="text-red-500 text-xs">
              Enter at least one valid address
            </span>
          )}
        </div>

        {/* Amounts (CSV) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-light mb-1">
            Amounts (comma-separated, in whole GGC)
          </label>
          <input
            {...register('amountsRaw', { required: true })}
            type="text"
            placeholder="100, 250, 50"
            className="w-full px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
          />
          {errors.amountsRaw && (
            <span className="text-red-500 text-xs">
              Enter matching amounts (whole GGC)
            </span>
          )}
        </div>

        {/* Submit Allocation Button */}
        <button
          type="submit"
          className="mb-4 px-6 py-3 bg-gold text-dark rounded-xl font-semibold hover:scale-105 transform transition"
        >
          Submit Allocation
        </button>

        {/* Parsing / submission errors */}
        {parsingError && <div className="text-red-500 text-sm">{parsingError}</div>}

        {/* Show Tx hash if success */}
        {txHash && (
          <div className="mt-2 text-green-400">
            Allocated! TxHash:{' '}
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

        {/* ─────────────────────────────────────────────────────────
                   2) Or Upload an Excel (.xlsx/.xls)
        ───────────────────────────────────────────────────────── */}
        <div className="mt-8">
          <label className="block text-sm font-medium text-light mb-1">
            Or upload an Excel with columns “address” & “amount”
          </label>
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={onFileUpload}
            className="block w-full text-sm text-light file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold file:text-dark hover:file:brightness-90"
          />
          {uploadError && <div className="mt-2 text-red-500 text-sm">{uploadError}</div>}
        </div>
      </form>

      {/* ───────────────────────────────────────────────────────────────
                   3) Lookup Allocation Section
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-700 mt-8">
        <h3 className="text-2xl text-light font-semibold mb-4">
          Lookup Allocation
        </h3>
        <div className="flex space-x-4">
          <input
            type="text"
            value={lookupAddress}
            onChange={(e) => setLookupAddress(e.target.value)}
            placeholder="0xAddressToLookup"
            className="flex-grow px-3 py-2 bg-gray-700 text-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <button
            type="button"
            onClick={handleLookup}
            className="px-4 py-2 bg-gold text-dark rounded-lg hover:scale-105 transform transition"
          >
            Lookup
          </button>
        </div>
        {lookupError && <div className="mt-2 text-red-500">{lookupError}</div>}
        {lookupResult && (
          <div className="mt-4">
            <AllocationCard {...lookupResult} />
          </div>
        )}
      </div>
      
    </div>
  );
};

export default OwnerDashboard;
