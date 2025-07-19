import { ethers } from 'ethers';
import contractAbi from './contractAbi.json';

// Replace with your deployed contract address
// export const CONTRACT_ADDRESS = '0xC0b6e7C06828EdDEF541ae57fd915289Ca8f892d'; //testnet 
// export const CONTRACT_ADDRESS = '0x684B3f4C0375f94B700F777c7743fe6105a2dca4'; //testnet
export const CONTRACT_ADDRESS = '0x58E11d8ED38a2061361e90916540c5c32281A380'; //mainnet

let provider: ethers.providers.Web3Provider | null = null;
let signer: ethers.Signer | null = null; 
let contract: ethers.Contract | null = null;

// export function initEthers() {
//   if (typeof window === 'undefined') {
//     console.log('Window is undefined, returning null provider');
//     return { provider: null, signer: null, contract: null };
//   }

//   const ethereum = (window as any).ethereum;
//   if (!ethereum) {
//     console.log('No ethereum provider found');
//     return { provider: null, signer: null, contract: null };
//   }

//   try {
//     if (!provider) {
//       console.log('Initializing new provider');
//       provider = new ethers.providers.Web3Provider(ethereum);
//     }
    
//     if (!signer) {
//       console.log('Initializing new signer');
//       signer = provider.getSigner();
//     }
    
//     if (!contract) {
//       console.log('Initializing new contract');
//       contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);
//     }

//     return { provider, signer, contract };
//   } catch (error) {
//     console.error('Failed to initialize ethers:', error);
//     return { provider: null, signer: null, contract: null };
//   }
// }


export function getProvider() {
  if (!window || !(window as any).ethereum) {
    throw new Error('No Web3 provider');
  }
  provider = new ethers.providers.Web3Provider((window as any).ethereum, 'any');
  return provider;
}

export async function getSigner(addr?: string): Promise<ethers.Signer> {
  const provider = getProvider();
  // ensure the user has already granted access once
  await provider.send('eth_requestAccounts', []);
  return addr
    ? provider.getSigner(addr)
    : provider.getSigner(); // same as getSigner(0)
}

export async function getContract(addr?: string): Promise<ethers.Contract> {
  const signer = await getSigner(addr);
  contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, signer);
  return contract;
}

export async function getAllocation(address: string) {
  const contract = await getContract(address);
  if (!contract) {
    // console.error('Contract not initialized in getAllocation');
    alert('Contract not initialized');
    return null;
  }
  try {
    // console.log('Calling allocations for address:', address);
    const alloc = await contract.allocations(address);
    // console.log('Raw allocation response:', alloc);

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
    // console.error('Error in getAllocation:', error);
    alert('Error fetching allocation: ' + (error as Error).message);
    return null;
  }
}

export async function isOwner(address: string) {
  const contract = await getContract();
  if (!contract) {
    // console.error('Contract not initialized in isOwner');
    alert('Contract not initialized');
    return false;
  }
  try {
    // console.log('Checking owner status for address:', address);
    const owner = await contract.owner();
    // console.log('Raw owner response:', owner);
    const isOwnerResult = owner.toLowerCase() === address.toLowerCase();
    // console.log('Owner check result:', isOwnerResult);
    return isOwnerResult;
  } catch (error) {
    // console.error('Error in isOwner:', error);
    alert('Error checking owner status: ' + (error as Error).message);
    return false;
  }
}

export async function getBalance(address: string) {
  const contract = await getContract();
  if (!contract) {
    // console.error('Contract not initialized in getBalance');
    alert('Contract not initialized');
    return '0';
  }
  try {
    // console.log('Getting balance for address:', address);
    const balance = await contract.balanceOf(address);
    // console.log('Raw balance response:', balance);
    return balance.toString();
  } catch (error) {
    // console.error('Error in getBalance:', error);
    alert('Error fetching balance: ' + (error as Error).message);
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
  const contract = await getContract();
  if (!contract) return null;
  try {
    const info = await contract.categories(categoryIndex);
    // console.log('Raw category info:', info);
    return info;
  } catch {
    return null;
  }
}

export async function getAddressChangeApproved(
  account: string
): Promise<boolean> {
  const contract = await getContract();
  return contract?.addressChangeApproved(account);
}

/**
 * ✅ Call approveAddressChange()
 */
export async function approveAddressChange(account: string): Promise<void> {
  const contract = await getContract(account);
  // console.log('Approving address change...',contract);
  const tx = await contract?.approveAddressChange();
  await tx.wait();
}

/**
 * ❌ Call revokeAddressChangeApproval()
 */
export async function revokeAddressChangeApproval(account: string): Promise<void> {
  const contract = await getContract(account);
  const tx = await contract?.revokeAddressChangeApproval();
  await tx.wait();
}