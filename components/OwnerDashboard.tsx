// components/OwnerDashboard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getCategoryInfo, getAllocation, getContract, getProvider, getSigner, getAirdropContract, CONTRACT_ADDRESS } from '../utils/ethers';
import { ethers } from 'ethers';
import * as XLSX from 'xlsx';
import AdminAllocationModal from './AdminAllocationModal';

interface FormValues {
  category: number;
  beneficiariesRaw: string;
  amountsRaw: string;
}

const CATEGORY_LABELS = [
  'Seed', 'Private', 'Public', 'Team', 'Advisors',
  'Marketing', 'Airdrop', 'Reserve', 'Liquidity', 'Rewards', 'Development'
];

export default function OwnerDashboard({ account }: { account: string }) {
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { category: 0, beneficiariesRaw: '', amountsRaw: '' }
  });

  const [categoryInfo, setCategoryInfo] = useState<any>(null);
  const [categoryPercentUsed, setCategoryPercentUsed] = useState<number>(0);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [showAllocModal, setShowAllocModal] = useState(false);
  const [currentAlloc, setCurrentAlloc] = useState<any>(null);

  const [lookupAddress, setLookupAddress] = useState<string>('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [revokeAddress, setRevokeAddress] = useState<string>('');
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeSuccess, setRevokeSuccess] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState<boolean>(false);

    // 4) Airdrop: single tx
    const [airdropAddr, setAirdropAddr]   = useState('');
    const [airdropAmt, setAirdropAmt]     = useState('');
    const [airdropErr, setAirdropErr]     = useState<string|null>(null);
    const [airdropLoading, setAirdropLoading] = useState(false);
    const [airdropSuccess, setAirdropSuccess] = useState<string|null>(null);

  const selectedCategory = watch('category');

  // Load category info
  useEffect(() => {
    async function loadCategory() {
      const info = await getCategoryInfo(selectedCategory);
      if (!info) return;
      setCategoryInfo(info);
      if (info.totalAmount !== '0') {
        const used = Number(ethers.utils.formatUnits(info.allocated, 18));
        const total = Number(ethers.utils.formatUnits(info.totalAmount, 18));
        setCategoryPercentUsed((used / total) * 100);
      } else setCategoryPercentUsed(0);
    }
    loadCategory();
  }, [selectedCategory]);

  // parse CSV
  const parseRawInputs = (rawAddrs: string, rawAmts: string) => {
    const addrs = rawAddrs.split(',').map(s => s.trim()).filter(Boolean);
    const amts = rawAmts.split(',').map(s => Number(s.trim())).filter(n => n > 0);
    if (addrs.length !== amts.length) throw new Error('Addresses and amounts count must match');
    return { addresses: addrs, amounts: amts };
  };

  // 1) Allocate via CSV
  const onSubmit = async (data: FormValues) => {
    const  contract  = await getContract(account || undefined);
    setParsingError(null);
    setTxHash(null);
    if (!contract) { setParsingError('Wallet not connected'); return; }
    try {
      const { addresses, amounts } = parseRawInputs(data.beneficiariesRaw, data.amountsRaw);
      const tx = await contract.allocateBatch(data.category, addresses, amounts);
      const res = await tx.wait();
      setTxHash(res.transactionHash);
      setValue('beneficiariesRaw', '');
      setValue('amountsRaw', '');
    } catch (e: any) {
       // Normalize the error code
    const code = e.code as string;
    // 1) User rejected in wallet
    if (code === 'ACTION_REJECTED') {
      alert('Transaction Rejected');
      return;
    }
      setParsingError(e.message || e.reason);
    }
  };

  // 2) Excel upload
  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const contract = await getContract(account || undefined);
    setUploadError(null);
    setTxHash(null);
    if (!contract) { setUploadError('Wallet not connected'); return; }
    const file = e.target.files?.[0];
    if (!file) { setUploadError('No file chosen'); return; }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target!.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        const addresses: string[] = [];
        const amounts: number[] = [];
        rows.forEach(r => {
          const a = (r as any).address?.toString().trim();
          const m = Number((r as any).amount);
          if (/^0x[a-fA-F0-9]{40}$/.test(a) && m > 0) {
            addresses.push(a);
            amounts.push(Math.floor(m));
          }
        });
        if (!addresses.length) throw new Error('Excel must contain valid rows');
        console.log('Airdrop addresses:', addresses);
        console.log('Airdrop amounts:', amounts);
        const tx = await contract.allocateBatch(selectedCategory, addresses, amounts);
        const res = await tx.wait();
        setTxHash(res.transactionHash);
      } catch (e: any) {
         // Normalize the error code
    const code = e.code as string;
    // 1) User rejected in wallet
    if (code === 'ACTION_REJECTED') {
      alert('Transaction Rejected');
      return;
    }
        setUploadError(e.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 3) Lookup
  const handleLookup = async () => {
    const contract = await getContract(account || undefined);
    setLookupError(null);
    if (!contract) { setLookupError('Wallet not connected'); return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(lookupAddress)) { setLookupError('Invalid address format'); return; }
    try {
      const alloc = await getAllocation(lookupAddress);
      if (!alloc || alloc.total === '0') { setLookupError('No allocation found'); return; }
      setCurrentAlloc(alloc);
      setShowAllocModal(true);
    } catch {
      setLookupError('Failed to fetch allocation');
    }
  };

  // 4) Revoke
  const handleRevoke = async () => {
    const contract = await getContract(account || undefined);
    setRevokeError(null);
    setRevokeSuccess(null);
    if (!contract) { setRevokeError('Wallet not connected'); return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(revokeAddress)) { setRevokeError('Invalid address'); return; }
    try {
      setRevokeLoading(true);
      const tx = await contract.revokeAllocation(revokeAddress);
      const res = await tx.wait();
      setRevokeSuccess(`Revoked! TxHash: ${res.transactionHash}`);
      setRevokeAddress('');
    } catch (e: any) {
            // Normalize the error code
    const code = e.code as string;
    // 1) User rejected in wallet
    if (code === 'ACTION_REJECTED') {
      alert('Transaction Rejected');
      return;
    }
      setRevokeError(e.reason);
    } finally { setRevokeLoading(false); }
  };

  // 5) Airdrop upload
  const handleAirdropUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAirdropErr(null);
    setAirdropSuccess(null);
    const contract = await getAirdropContract(account || undefined);
    const tokenContract = await getContract(account || undefined);
    console.log('Airdrop contract:', contract);
    console.log('Token contract:', tokenContract);
    setUploadError(null);
    setTxHash(null);
    if (!contract) { setUploadError('Wallet not connected'); return; }
    const file = e.target.files?.[0];
    if (!file) return setAirdropErr('No file chosen');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target!.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        const addresses: string[] = [];
        const amounts: number[] = [];
        rows.forEach(r => {
          const a = (r as any).address?.toString().trim();
          const m = Number((r as any).amount);
          if (/^0x[a-fA-F0-9]{40}$/.test(a) && m > 0) {
            addresses.push(a);
            amounts.push(Math.floor(m));
          }
        });
        if (!addresses.length) throw new Error('Excel must contain valid rows');
        setAirdropLoading(true);
        
        const tx = await contract.batchTransfer(CONTRACT_ADDRESS, addresses, amounts);
        const res = await tx.wait();
        setTxHash(res.transactionHash);
      } catch (e: any) {
         // Normalize the error code
    const code = e.code as string;
    // 1) User rejected in wallet
    if (code === 'ACTION_REJECTED') {
      alert('Transaction Rejected');
      return;
    }
        setUploadError(e.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <>
      {showAllocModal && currentAlloc && (
        <AdminAllocationModal
          allocation={currentAlloc}
          onClose={() => setShowAllocModal(false)}
          lookupAddress={lookupAddress}
        />
      )}
      <h2 className="text-2xl text-gold font-bold text-center uppercase opacity-30 tracking-[2em] mb-5 mt-5">OWNER'S PANEL</h2>

      <div className="mt-2 px-2 max-w-sm max-h-px mx-auto space-y-8">
      {/* <h2 className="text-2xl text-gold font-bold text-center uppercase opacity-30 tracking-[0.5em]">OWNER'S PANEL</h2> */}

        {/* 1) Allocate Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ background: "url('/Popup-1.png') no-repeat center/cover" }}
          className="relative rounded-2xl p-6 shadow-lg border border-gray-700 max-w-full mx-auto"
        >
          <h3 className="text-xl text-black text-center font-semibold mb-4">ALLOCATE FROM CATEGORY</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-black mb-1">Select Category</label>
            <select
              {...register('category', { required: true })}
              style={{ background: "url('/Text-Field.png') no-repeat center/cover", backgroundSize: 'cover' }}
              className="w-full h-10 px-4 bg-transparent bg-gold rounded-lg focus:outline-none"
            >
              {CATEGORY_LABELS.map((l,i) => <option key={i} value={i}>{l}</option>)}
            </select>
          </div>

          {categoryInfo && (
            <p className="mb-4 text-sm text-light">
              Usage: {categoryPercentUsed.toFixed(2)}% ({ethers.utils.formatUnits(categoryInfo.allocated,18)} / {ethers.utils.formatUnits(categoryInfo.totalAmount,18)})
            </p>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-black mb-1">Beneficiary Addresses</label>
            <input
              {...register('beneficiariesRaw',{required:true})}
              placeholder="0x123…,0x456…"
              style={{ background: "url('/Text-Field.png') no-repeat center/cover" }}
              className="w-full h-10 px-4 bg-transparent rounded-lg focus:outline-none"
            />
            {errors.beneficiariesRaw && <p className="text-red-500 text-xs">Enter at least one valid address</p>}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-1">Amounts (whole GGC)</label>
            <input
              {...register('amountsRaw',{required:true})}
              placeholder="100,250"
              style={{ background: "url('/Text-Field.png') no-repeat center/cover" }}
              className="w-full h-10 px-4 bg-transparent rounded-lg focus:outline-none"
            />
            {errors.amountsRaw && <p className="text-red-500 text-xs">Enter matching amounts</p>}
          </div>

          <div className="flex flex-col items-center space-y-4 mt-6">
            <button
              type="submit"
              className="w-xs h-10 bg-cover font-semibold hover:scale-105"
              style={{ background: "url('/Brows-File-Button-Plain.png') no-repeat center/cover" }}
            >Submit Allocation</button>
            {/* <button
              type="button"
              className="w-xs h-10 bg-cover font-semibold hover:scale-105"
              style={{ background: "url('/Brows-File-Button-Plain.png') no-repeat center/cover" }}
              onClick={() => document.getElementById('fileInput')?.click()}
            >Choose File</button>
            <input id="fileInput" type="file" accept=".xls,.xlsx" hidden onChange={onFileUpload} /> */}
          </div>

          {parsingError && <p className="mt-4 text-red-500 text-center">{parsingError}</p>}
          {txHash && <p className="mt-2 text-green-400 text-center">Allocated! TxHash: {txHash.slice(0,6)}…{txHash.slice(-4)}</p>}
        </form>

        {/* 2) Lookup Card */}
        <div
          style={{ background: "url('/Popup-1.png') no-repeat center/cover" }}
          className="relative rounded-2xl p-2 shadow-lg border border-gray-700 max-w-full mx-auto"
        >
          <h3 className="text-2xl text-light font-semibold text-center mb-4">Lookup Allocation</h3>
          <input
            value={lookupAddress}
            onChange={e => setLookupAddress(e.target.value)}
            placeholder="0xAddressToLookup"
            style={{ background: "url('/Text-Field.png') no-repeat center/cover" }}
            className="w-full h-10 px-4 bg-transparent rounded-lg focus:outline-none mb-4"
          />
          {lookupError && <p className="text-red-500 text-center mb-4">{lookupError}</p>}
          <div className="flex justify-center">
            <button
              className="w-40 h-10 bg-cover font-semibold hover:scale-105"
              style={{ background: "url('/Brows-File-Button-Plain.png') no-repeat center/cover" }}
              onClick={handleLookup}
            >Lookup</button>
          </div>
        </div>

        {/* 3) Revoke Card */}
        <div
          style={{ background: "url('/Popup-1.png') no-repeat center/cover" }}
          className="relative rounded-2xl p-2 shadow-lg border border-gray-700 max-w-full mx-auto"
        >
          <h3 className="text-2xl text-light font-semibold text-center mb-4">Revoke Allocation</h3>
          <input
            value={revokeAddress}
            onChange={e => setRevokeAddress(e.target.value)}
            placeholder="0xBeneficiaryToRevoke"
            style={{ background: "url('/Text-Field.png') no-repeat center/cover" }}
            className="w-full h-10 px-4 bg-transparent rounded-lg focus:outline-none mb-4"
          />
          {revokeError && <p className="text-red-500 text-center mb-4">{revokeError}</p>}
          <div className="flex justify-center">
            <button
              className="w-40 h-10 bg-cover font-semibold hover:scale-105"
              style={{ background: `url('/Brows-File-Button-Plain.png') no-repeat center/cover` }}
              onClick={handleRevoke}
              disabled={revokeLoading}
            >{revokeLoading ? 'Revoking…' : 'Revoke'}</button>
          </div>
          {revokeSuccess && <p className="text-green-400 text-center mt-4">{revokeSuccess}</p>}
        </div>
          {/* 3) Airdrop Card */}
      <div
        style={{ background: "url('/Popup-1.png') no-repeat center/cover" }}
        className="relative rounded-2xl p-2 shadow-lg border border-gray-700 max-w-full mx-auto"
      >
        <h3 className="text-2xl text-light font-semibold text-center mb-4">
          Airdrop (Excel upload)
        </h3>
        <div className="flex justify-center">
          <button
            onClick={() => document.getElementById('airdropFileInput')?.click()}
            className="w-40 h-10 bg-cover font-semibold hover:scale-105"
            style={{ background: "url('/Brows-File-Button-Plain.png') no-repeat center/cover" }}
          >
            Choose File
          </button>
          <input
            id="airdropFileInput"
            type="file"
            accept=".xls,.xlsx"
            hidden
            onChange={handleAirdropUpload}
          />
        </div>
        {airdropErr     && <p className="mt-2 text-red-500 text-center">{airdropErr}</p>}
        {airdropSuccess && <p className="mt-2 text-green-400 text-center">{airdropSuccess}</p>}
      </div>
      </div>
    </>
  );
}
