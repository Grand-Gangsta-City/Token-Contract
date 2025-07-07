import { ethers } from 'ethers';
import contractAbi from './contractAbi.json';

// Replace with your deployed contract address
// export const CONTRACT_ADDRESS = '0xC0b6e7C06828EdDEF541ae57fd915289Ca8f892d'; //testnet 
export const CONTRACT_ADDRESS = '0x41B97742CDFA0e512F385f7599319F27E2075378'; //testnet
// export const CONTRACT_ADDRESS = '0x0F206878eEE8d8Ec6788BaCE3E1f183b42dF75B9'; //mainnet

let provider: ethers.providers.Web3Provider | null = null;
let signer: ethers.Signer | null = null;
let contract: ethers.Contract | null = null;

export function initEthers() {
  if (typeof window === 'undefined') {
    console.log('Window is undefined, returning null provider');
    return { provider: null, signer: null, contract: null };
  }

  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    console.log('No ethereum provider found');
    return { provider: null, signer: null, contract: null };
  }

  try {
    if (!provider) {
      console.log('Initializing new provider');
      provider = new ethers.providers.Web3Provider(ethereum);
    }
    
    if (!signer) {
      console.log('Initializing new signer');
      signer = provider.getSigner();
    }
    
    if (!contract) {
      console.log('Initializing new contract');
      contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);
    }

    return { provider, signer, contract };
  } catch (error) {
    console.error('Failed to initialize ethers:', error);
    return { provider: null, signer: null, contract: null };
  }
}

export async function getAllocation(address: string) {
  if (!contract) {
    console.error('Contract not initialized in getAllocation');
    return null;
  }
  try {
    console.log('Calling allocations for address:', address);
    const alloc = await contract.allocations(address);
    console.log('Raw allocation response:', alloc);

    return {
      category: alloc.category,
      total: alloc.total.toString(),
      tgeUnlock: alloc.tgeUnlock.toString(),
      cliffMonths: alloc.cliffMonths.toNumber(),
      vestingMonths: alloc.vestingMonths.toNumber(),
      claimPerSecond: alloc.claimPerSecond.toString(),
      claimed: alloc.claimed.toString(),
      startTimestamp: alloc.startTimestamp.toNumber()
    };
  } catch (error) {
    console.error('Error in getAllocation:', error);
    return null;
  }
}

export async function isOwner(address: string) {
  if (!contract) {
    console.error('Contract not initialized in isOwner');
    return false;
  }
  try {
    console.log('Checking owner status for address:', address);
    const owner = await contract.owner();
    const isOwnerResult = owner.toLowerCase() === address.toLowerCase();
    console.log('Owner check result:', isOwnerResult);
    return isOwnerResult;
  } catch (error) {
    console.error('Error in isOwner:', error);
    return false;
  }
}

export async function getBalance(address: string) {
  if (!contract) {
    console.error('Contract not initialized in getBalance');
    return '0';
  }
  try {
    console.log('Getting balance for address:', address);
    const balance = await contract.balanceOf(address);
    console.log('Raw balance response:', balance);
    return balance.toString();
  } catch (error) {
    console.error('Error in getBalance:', error);
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

/// If you still need category-usage percentages, keep getCategoryInfo() as before:
export async function getCategoryInfo(categoryIndex: number): Promise<CategoryInfo | null> {
  if (!contract) return null;
  try {
    const info = await contract.categories(categoryIndex);
    console.log('Raw category info:', info);
    return info;
  } catch {
    return null;
  }
}