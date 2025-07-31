import { TezosToolkit } from '@taquito/taquito';
import dotenv from 'dotenv';

dotenv.config();

export const tezosConfig = {
  rpcUrl: process.env.TEZOS_RPC_URL || 'https://ghostnet.tezos.marigold.dev',
  privateKey: process.env.TEZOS_PRIVATE_KEY || '',
  network: process.env.TEZOS_NETWORK || 'ghostnet',
  escrowContract: process.env.TEZOS_ESCROW_CONTRACT || '',
};

export const tezosToolkit = new TezosToolkit(tezosConfig.rpcUrl); 