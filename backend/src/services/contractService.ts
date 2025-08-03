import { ethers } from 'ethers';
import { TezosToolkit, MichelsonMap } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import { ethereumWallet, ethereumProvider } from '../config/ethereum';
import { tezosToolkit, tezosConfig } from '../config/tezos';
import { Logger } from '../utils/logger';
import { CryptoUtils } from '../utils/crypto';

const ETHEREUM_HTLC_ABI = [
  "function createSwap(address _taker, bytes32 _secretHash, uint256 _timelockHours, address _tokenAddress, uint256 _amount) external payable",
  "function claimSwap(uint256 _swapId, bytes32 _secret) external",
  "function refundSwap(uint256 _swapId) external",
  "function getSwap(uint256 _swapId) external view returns (tuple(uint256 swapId, address maker, address taker, uint256 amount, address tokenAddress, bytes32 secretHash, uint256 timelock, uint8 status, uint256 createdAt))",
  "function swapExists(uint256 _swapId) external view returns (bool)",
  "function nextSwapId() external view returns (uint256)",
  "event SwapCreated(uint256 indexed swapId, address indexed maker, address indexed taker, uint256 amount, address tokenAddress, bytes32 secretHash, uint256 timelock)",
  "event SwapClaimed(uint256 indexed swapId, address indexed claimer, bytes32 secret)",
  "event SwapRefunded(uint256 indexed swapId, address indexed maker)"
];

export interface EthereumSwap {
  swapId: bigint;
  maker: string;
  taker: string;
  amount: bigint;
  tokenAddress: string;
  secretHash: string;
  timelock: bigint;
  status: number; // 0: Active, 1: Claimed, 2: Refunded
  createdAt: bigint;
}

export interface TezosSwapData {
  swap_id: number;
  maker: string;
  taker?: string;
  amount: number; // in mutez
  token_address?: string;
  token_id?: number;
  token_amount?: number;
  secret_hash: string;
  timelock: string;
  status: 'active' | 'claimed' | 'refunded';
  created_at: string;
}

export interface CreateSwapParams {
  taker?: string;
  secretHash: string;
  timelockHours: number;
  tokenAddress?: string;
  amount: string;
  isEthereumSource: boolean;
}

export class ContractService {
  private static ethereumContract: ethers.Contract | null = null;
  private static tezosContract: any = null;

  static async initialize(): Promise<void> {
    try {
      Logger.info('Initializing contract services...');
      
      const ethereumAddress = process.env.ETHEREUM_HTLC_ADDRESS;
      if (ethereumAddress && ethereumWallet) {
        this.ethereumContract = new ethers.Contract(
          ethereumAddress,
          ETHEREUM_HTLC_ABI,
          ethereumWallet
        );
        Logger.info('Ethereum HTLC contract initialized', { address: ethereumAddress });
      } else {
        Logger.warn('Ethereum HTLC contract address or private key not configured');
      }

      const tezosAddress = process.env.TEZOS_HTLC_ADDRESS;
      if (tezosAddress && tezosConfig.privateKey) {
        await tezosToolkit.setProvider({
          signer: await InMemorySigner.fromSecretKey(tezosConfig.privateKey),
        });
        
        this.tezosContract = await tezosToolkit.contract.at(tezosAddress);
        Logger.info('Tezos HTLC contract initialized', { address: tezosAddress });
      } else {
        Logger.warn('Tezos HTLC contract address or private key not configured');
      }
      
    } catch (error) {
      Logger.error('Failed to initialize contract services', error);
      throw error;
    }
  }

  static async createEthereumSwap(params: CreateSwapParams): Promise<string> {
    try {
      if (!this.ethereumContract) {
        throw new Error('Ethereum contract not initialized');
      }

      Logger.info('Creating Ethereum swap', params);

      const {
        taker = ethers.ZeroAddress,
        secretHash,
        timelockHours,
        tokenAddress = ethers.ZeroAddress,
        amount
      } = params;

      let tx;
      
      if (tokenAddress === ethers.ZeroAddress) {
        const value = ethers.parseEther(amount);
        tx = await this.ethereumContract.createSwap(
          taker,
          secretHash,
          timelockHours,
          tokenAddress,
          0, // amount ignored for ETH
          { value }
        );
      } else {
        const tokenAmount = ethers.parseUnits(amount, 18); 
        tx = await this.ethereumContract.createSwap(
          taker,
          secretHash,
          timelockHours,
          tokenAddress,
          tokenAmount
        );
      }

      Logger.info('Ethereum swap transaction sent', { hash: tx.hash });
      return tx.hash;
      
    } catch (error) {
      Logger.error('Failed to create Ethereum swap', error);
      throw error;
    }
  }

  static async createTezosSwap(params: CreateSwapParams): Promise<string> {
    try {
      if (!this.tezosContract) {
        throw new Error('Tezos contract not initialized');
      }

      Logger.info('Creating Tezos swap', params);

      const {
        taker,
        secretHash,
        timelockHours,
        tokenAddress,
        amount
      } = params;

      const swapParams = {
        taker: taker ? taker : null,
        secret_hash: secretHash,
        timelock_hours: timelockHours,
        token_address: tokenAddress ? tokenAddress : null,
        token_id: null,
        token_amount: tokenAddress ? parseInt(amount) : null
      };

      let operation;
      
      if (!tokenAddress) {
        const amountMutez = parseFloat(amount) * 1_000_000; 
        operation = await this.tezosContract.methods.create_swap(swapParams).send({
          amount: amountMutez,
          mutez: true
        });
      } else {
        operation = await this.tezosContract.methods.create_swap(swapParams).send();
      }

      Logger.info('Tezos swap operation sent', { hash: operation.hash });
      return operation.hash;
      
    } catch (error) {
      Logger.error('Failed to create Tezos swap', error);
      throw error;
    }
  }

  static async claimEthereumSwap(swapId: number, secret: string): Promise<string> {
    try {
      if (!this.ethereumContract) {
        throw new Error('Ethereum contract not initialized');
      }

      Logger.info('Claiming Ethereum swap', { swapId, secret });

      const tx = await this.ethereumContract.claimSwap(swapId, secret);
      
      Logger.info('Ethereum claim transaction sent', { hash: tx.hash });
      return tx.hash;
      
    } catch (error) {
      Logger.error('Failed to claim Ethereum swap', error);
      throw error;
    }
  }

  static async claimTezosSwap(swapId: number, secret: string): Promise<string> {
    try {
      if (!this.tezosContract) {
        throw new Error('Tezos contract not initialized');
      }

      Logger.info('Claiming Tezos swap', { swapId, secret });

      const operation = await this.tezosContract.methods.claim_swap({
        swap_id: swapId,
        secret: secret
      }).send();

      Logger.info('Tezos claim operation sent', { hash: operation.hash });
      return operation.hash;
      
    } catch (error) {
      Logger.error('Failed to claim Tezos swap', error);
      throw error;
    }
  }

  static async refundEthereumSwap(swapId: number): Promise<string> {
    try {
      if (!this.ethereumContract) {
        throw new Error('Ethereum contract not initialized');
      }

      Logger.info('Refunding Ethereum swap', { swapId });

      const tx = await this.ethereumContract.refundSwap(swapId);
      
      Logger.info('Ethereum refund transaction sent', { hash: tx.hash });
      return tx.hash;
      
    } catch (error) {
      Logger.error('Failed to refund Ethereum swap', error);
      throw error;
    }
  }

  static async refundTezosSwap(swapId: number): Promise<string> {
    try {
      if (!this.tezosContract) {
        throw new Error('Tezos contract not initialized');
      }

      Logger.info('Refunding Tezos swap', { swapId });

      const operation = await this.tezosContract.methods.refund_swap({
        swap_id: swapId
      }).send();

      Logger.info('Tezos refund operation sent', { hash: operation.hash });
      return operation.hash;
      
    } catch (error) {
      Logger.error('Failed to refund Tezos swap', error);
      throw error;
    }
  }

  static async getEthereumSwap(swapId: number): Promise<EthereumSwap | null> {
    try {
      if (!this.ethereumContract) {
        throw new Error('Ethereum contract not initialized');
      }

      const exists = await this.ethereumContract.swapExists(swapId);
      if (!exists) {
        return null;
      }

      const swap = await this.ethereumContract.getSwap(swapId);
      return {
        swapId: swap.swapId,
        maker: swap.maker,
        taker: swap.taker,
        amount: swap.amount,
        tokenAddress: swap.tokenAddress,
        secretHash: swap.secretHash,
        timelock: swap.timelock,
        status: swap.status,
        createdAt: swap.createdAt
      };
      
    } catch (error) {
      Logger.error('Failed to get Ethereum swap', error);
      return null;
    }
  }

  static async getTezosSwap(swapId: number): Promise<TezosSwapData | null> {
    try {
      if (!this.tezosContract) {
        throw new Error('Tezos contract not initialized');
      }

      const storage = await this.tezosContract.storage();
      const swap = storage.swaps.get(swapId.toString());
      
      if (!swap) {
        return null;
      }

      return {
        swap_id: swap.swap_id,
        maker: swap.maker,
        taker: swap.taker || undefined,
        amount: swap.amount,
        token_address: swap.token_address || undefined,
        token_id: swap.token_id || undefined,
        token_amount: swap.token_amount || undefined,
        secret_hash: swap.secret_hash,
        timelock: swap.timelock,
        status: swap.status,
        created_at: swap.created_at
      };
      
    } catch (error) {
      Logger.error('Failed to get Tezos swap', error);
      return null;
    }
  }

  static setupEthereumEventListeners(): void {
    if (!this.ethereumContract) {
      Logger.warn('Cannot setup Ethereum event listeners - contract not initialized');
      return;
    }

    Logger.info('Setting up Ethereum contract event listeners');

    this.ethereumContract.on('SwapCreated', (swapId, maker, taker, amount, tokenAddress, secretHash, timelock, event) => {
      Logger.info('Ethereum SwapCreated event', {
        swapId: swapId.toString(),
        maker,
        taker,
        amount: amount.toString(),
        tokenAddress,
        secretHash,
        timelock: timelock.toString(),
        txHash: event.transactionHash
      });
    });

    this.ethereumContract.on('SwapClaimed', (swapId, claimer, secret, event) => {
      Logger.info('Ethereum SwapClaimed event', {
        swapId: swapId.toString(),
        claimer,
        secret,
        txHash: event.transactionHash
      });
    });

    this.ethereumContract.on('SwapRefunded', (swapId, maker, event) => {
      Logger.info('Ethereum SwapRefunded event', {
        swapId: swapId.toString(),
        maker,
        txHash: event.transactionHash
      });
    });
  }

  static getContractAddresses(): { ethereum?: string; tezos?: string } {
    return {
      ethereum: process.env.ETHEREUM_HTLC_ADDRESS,
      tezos: process.env.TEZOS_HTLC_ADDRESS
    };
  }

  static async healthCheck(): Promise<{ ethereum: boolean; tezos: boolean }> {
    const results = { ethereum: false, tezos: false };

    try {
      if (this.ethereumContract) {
        await this.ethereumContract.nextSwapId();
        results.ethereum = true;
      }
    } catch (error) {
      Logger.error('Ethereum contract health check failed', error);
    }

    try {
      if (this.tezosContract) {
        await this.tezosContract.storage();
        results.tezos = true;
      }
    } catch (error) {
      Logger.error('Tezos contract health check failed', error);
    }

    return results;
  }
}