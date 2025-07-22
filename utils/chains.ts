export const CHAIN_INFO: Record<number, {
    name: string;
    hex: string;
    network: string;
    addressPrefix: string;
    addressLength: number | number[];
    rpcUrls?: string[];
    explorer?: string;
  }> = {
    1: {
      name: 'Ethereum',
      hex: '0x1',
      network: 'ethereum',
      addressPrefix: '0x',
      addressLength: 42,
    },
    56: {
      name: 'Binance Smart Chain',
      hex: '0x38',
      network: 'bsc',
      addressPrefix: '0x',
      addressLength: 42,
    },
    137: {
      name: 'Polygon',
      hex: '0x89',
      network: 'polygon',
      addressPrefix: '0x',
      addressLength: 42,
    },
    80002: {
      name: 'Polygon Testnet (Amoy)',
      hex: '0x13882',
      network: 'matic_amoy',
      addressPrefix: '0x',
      addressLength: 42,
    },
    11155111: {
      name: 'Sepolia',
      hex: '0xaa36a7',
      network: 'eth_sepolia',
      addressPrefix: '0x',
      addressLength: 42,
    },
    84532: {
      name: 'Base Sepolia',
      hex: '0x14a34',
      network: 'base_sepolia',
      addressPrefix: '0x',
      addressLength: 42,
    },
    8453: {
      name: 'Base',
      hex: '0x2105',
      network: 'base',
      addressPrefix: '0x',
      addressLength: 42,
    },
    78600: {
      name: 'Vanar Testnet',
      hex: '0x13308',
      network: 'vanar_testnet',
      addressPrefix: '0x',
      addressLength: 42,
    },
    1329: {
        name: 'Sei Network',
        hex: '0x531',
        network: 'sei_mainnet',
        addressPrefix: '0x',
        addressLength: 42,
        rpcUrls: ['https://evm-rpc.sei-apis.com'],
        explorer: 'https://seitrace.com',
      }
    };