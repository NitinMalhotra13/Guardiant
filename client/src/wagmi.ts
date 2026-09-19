import { createConfig, http } from 'wagmi';
import { mainnet, hardhat } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';
import { type Chain } from 'wagmi/chains';

export const localHardhat: Chain = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public:  { http: ['http://127.0.0.1:8545'] },
  },
};

/**
 * For local dev: use MetaMask injected connector only (no WalletConnect needed).
 * WalletConnect requires a paid/real projectId — skip it for Hardhat testing.
 */
export const config = createConfig({
  chains: [localHardhat, mainnet],
  connectors: [
    metaMask(),
    injected(),
  ],
  transports: {
    [localHardhat.id]: http('http://127.0.0.1:8545'),
    [mainnet.id]:      http(),
  },
  ssr: true,
});
