import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

export function getWagmiConfig() {
  return getDefaultConfig({
    appName: 'SwapTezos',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string, 
    chains: [mainnet, sepolia],
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
    },
  });
}
