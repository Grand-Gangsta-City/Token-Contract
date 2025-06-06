import { ethers } from 'ethers';
import contractAbi from './contractAbi.json';

// Replace with your deployed contract address
// export const CONTRACT_ADDRESS = '0x3ed343Df44bbDC2EDcE4535c6f64884Fc83Aa83f';0xEFD337AC87EDf41A740AedD386d7f650D29D6e90
export const CONTRACT_ADDRESS = '0xEFD337AC87EDf41A740AedD386d7f650D29D6e90';
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