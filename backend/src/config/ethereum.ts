import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

export const ethereumConfig = {
  rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://goerli.infura.io/v3/YOUR_INFURA_KEY',
  privateKey: process.env.ETHEREUM_PRIVATE_KEY || '',
  chainId: parseInt(process.env.ETHEREUM_CHAIN_ID || '5'),
  escrowFactory: process.env.ETHEREUM_ESCROW_FACTORY || '',
};

export const ethereumProvider = new ethers.JsonRpcProvider(ethereumConfig.rpcUrl);

export const ethereumWallet = new ethers.Wallet(
  ethereumConfig.privateKey,
  ethereumProvider
); 