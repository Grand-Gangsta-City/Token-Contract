import { ethers } from 'ethers';
import contractAbi from './contractAbi.json';

// Replace with your deployed contract address
// export const CONTRACT_ADDRESS = '0xC0b6e7C06828EdDEF541ae57fd915289Ca8f892d'; //testnet
  export const CONTRACT_ADDRESS = '0x1ef5bB3a03e0e2730d5b5036b743b9cD9F3C0312'; //mainnet

let provider: ethers.providers.Web3Provider | null = null;
let signer: ethers.Signer | null = null;
let contract: ethers.Contract | null = null;

export function initEthers() {
  if (!provider && typeof window !== 'undefined' && (window as any).ethereum) {
    provider = new ethers.providers.Web3Provider((window as any).ethereum);
    signer = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);
  }
  return { provider, signer, contract };
}

export async function getAllocation(address: string) {
  if (!contract) return null;
  try {
    // The deployed contract’s Allocation struct is:
    // (total, tgeUnlock, cliffMonths, vestingMonths, claimPerSecond, claimed, startTimestamp)
    const alloc = await contract.allocations(address);

    return {
      total: alloc.total.toString(),
      tgeUnlock: alloc.tgeUnlock.toString(),
      cliffMonths: alloc.cliffMonths.toNumber(),
      vestingMonths: alloc.vestingMonths.toNumber(),
      claimPerSecond: alloc.claimPerSecond.toString(),
      claimed: alloc.claimed.toString(),
      startTimestamp: alloc.startTimestamp.toNumber()
    };
  } catch {
    return null;
  }
}

export async function isOwner(address: string) {
  if (!contract) return false;
  try {
    const owner = await contract.owner();
    return owner.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

export async function getBalance(address: string) {
  if (!contract) return '0';
  try {
    const balance = await contract.balanceOf(address);
    return balance.toString();
  } catch {
    return '0';
  }
}

export interface CategoryInfo {
  totalAmount: string;   // wei
  tgePercent: number;
  cliffMonths: number;
  vestingMonths: number;
  allocated: string;     // wei
  usesPerMille: boolean;
}

/// If you still need category‐usage percentages, keep getCategoryInfo() as before:
export async function getCategoryInfo(categoryIndex: number): Promise<CategoryInfo | null> {
  if (!contract) return null;
  try {
    const info = await contract.categories(categoryIndex);
    return {
      totalAmount: info.totalAmount.toString(),
      tgePercent: info.tgePercent.toNumber(),
      cliffMonths: info.cliffMonths.toNumber(),
      vestingMonths: info.vestingMonths.toNumber(),
      allocated: info.allocated.toString(),
      usesPerMille: info.usesPerMille
    };
  } catch {
    return null;
  }
}