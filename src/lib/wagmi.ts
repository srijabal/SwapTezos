import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

export function getWagmiConfig() {
  return getDefaultConfig({
    appName: 'SwapTezos',
    projectId: 'd290354e90fb80fe7209b6969081a478', 
    chains: [mainnet, sepolia],
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
    },
  });
}
