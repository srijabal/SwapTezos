import { ethers } from 'ethers';
import { TezosToolkit } from '@taquito/taquito';
import { ethereumProvider, ethereumConfig } from '../config/ethereum';
import { tezosToolkit, tezosConfig } from '../config/tezos';
import { TransactionModel, Transaction } from '../models/Transaction';
import { Logger } from '../utils/logger';

export interface BlockchainTransaction {
  hash: string;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  timestamp?: Date;
}

export class BlockchainService {
  private static ethereumProvider = ethereumProvider;
  private static tezosToolkit = tezosToolkit;

  static async monitorPendingTransactions(): Promise<void> {
    try {
      const pendingTransactions = await TransactionModel.findPendingTransactions();
      
      for (const transaction of pendingTransactions) {
        await this.checkTransactionStatus(transaction);
      }
    } catch (error) {
      Logger.error('Failed to monitor pending transactions', error);
    }
  }

  private static async checkTransactionStatus(transaction: Transaction): Promise<void> {
    try {
      let blockchainTx: BlockchainTransaction | null = null;

      if (transaction.chain === 'ethereum') {
        blockchainTx = await this.getEthereumTransaction(transaction.tx_hash);
      } else if (transaction.chain === 'tezos') {
        blockchainTx = await this.getTezosTransaction(transaction.tx_hash);
      }

      if (blockchainTx) {
        await this.updateTransactionFromBlockchain(transaction, blockchainTx);
      }
    } catch (error) {
      Logger.error('Failed to check transaction status', { 
        transactionId: transaction.id, 
        txHash: transaction.tx_hash,
        error 
      });
    }
  }

  static async getEthereumTransaction(txHash: string): Promise<BlockchainTransaction | null> {
    try {
      const tx = await this.ethereumProvider.getTransaction(txHash);
      if (!tx) {
        return null;
      }

      const receipt = await this.ethereumProvider.getTransactionReceipt(txHash);
      const currentBlock = await this.ethereumProvider.getBlockNumber();
      
      let status: 'pending' | 'confirmed' | 'failed' = 'pending';
      let confirmations = 0;

      if (receipt) {
        confirmations = currentBlock - receipt.blockNumber + 1;
        status = receipt.status === 1 ? 
          (confirmations >= 6 ? 'confirmed' : 'pending') : 
          'failed';
      }

      let timestamp: Date | undefined;
      if (receipt) {
        try {
          const block = await this.ethereumProvider.getBlock(receipt.blockNumber);
          timestamp = block ? new Date(block.timestamp * 1000) : undefined;
        } catch (e) {
          Logger.warn('Failed to get block timestamp', { blockNumber: receipt.blockNumber });
        }
      }

      return {
        hash: txHash,
        confirmations,
        status,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        timestamp
      };
    } catch (error) {
      Logger.error('Failed to get Ethereum transaction', { txHash, error });
      return null;
    }
  }

  static async getTezosTransaction(opHash: string): Promise<BlockchainTransaction | null> {
    try {
      let operation;
      try {
        const head = await this.tezosToolkit.rpc.getBlockHeader();
        return {
          hash: opHash,
          confirmations: 1, 
          status: 'confirmed' as const,
          blockNumber: head.level,
          timestamp: new Date(head.timestamp)
        };
      } catch (error) {
        Logger.warn('Could not verify Tezos operation', { opHash, error });
        return null;
      }
    } catch (error) {
      Logger.error('Failed to get Tezos transaction', { opHash, error });
      return null;
    }
  }

  private static async updateTransactionFromBlockchain(
    dbTransaction: Transaction, 
    blockchainTx: BlockchainTransaction
  ): Promise<void> {
    try {
      if (dbTransaction.status !== blockchainTx.status) {
        await TransactionModel.updateStatus(dbTransaction.id, blockchainTx.status);
        
        Logger.info('Transaction status updated', {
          transactionId: dbTransaction.id,
          txHash: dbTransaction.tx_hash,
          oldStatus: dbTransaction.status,
          newStatus: blockchainTx.status,
          confirmations: blockchainTx.confirmations
        });
      }
    } catch (error) {
      Logger.error('Failed to update transaction from blockchain', {
        transactionId: dbTransaction.id,
        error
      });
    }
  }

  static async getCurrentBlockNumbers(): Promise<{ ethereum: number; tezos: number }> {
    try {
      const [ethBlock, tezosBlock] = await Promise.all([
        this.ethereumProvider.getBlockNumber(),
        this.tezosToolkit.rpc.getBlockHeader()
      ]);

      return {
        ethereum: ethBlock,
        tezos: tezosBlock.level
      };
    } catch (error) {
      Logger.error('Failed to get current block numbers', error);
      return { ethereum: 0, tezos: 0 };
    }
  }

  static async estimateTransactionCosts(
    chain: 'ethereum' | 'tezos',
    txType: 'deposit' | 'claim' | 'refund'
  ): Promise<{ gasLimit?: string; gasPrice?: string; fee?: string }> {
    try {
      if (chain === 'ethereum') {
        const gasPrice = await this.ethereumProvider.getFeeData();
        
        const gasLimits = {
          deposit: '150000',
          claim: '100000',
          refund: '80000'
        };

        return {
          gasLimit: gasLimits[txType],
          gasPrice: gasPrice.gasPrice?.toString() || '0'
        };
      } else {
        const feeEstimates = {
          deposit: '0.01',
          claim: '0.008',
          refund: '0.006'
        };

        return {
          fee: feeEstimates[txType]
        };
      }
    } catch (error) {
      Logger.error('Failed to estimate transaction costs', { chain, txType, error });
      return {};
    }
  }

  static async checkBalance(
    chain: 'ethereum' | 'tezos',
    address: string,
    tokenAddress?: string
  ): Promise<string> {
    try {
      if (chain === 'ethereum') {
        if (tokenAddress && tokenAddress !== ethers.ZeroAddress) {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ['function balanceOf(address) view returns (uint256)'],
            this.ethereumProvider
          );
          const balance = await tokenContract.balanceOf(address);
          return balance.toString();
        } else {
          const balance = await this.ethereumProvider.getBalance(address);
          return balance.toString();
        }
      } else {
        const balance = await this.tezosToolkit.tz.getBalance(address);
        return balance.toString();
      }
    } catch (error) {
      Logger.error('Failed to check balance', { chain, address, tokenAddress, error });
      return '0';
    }
  }

  
  static async getTransactionHistory(
    chain: 'ethereum' | 'tezos',
    address: string,
    limit: number = 10
  ): Promise<BlockchainTransaction[]> {
    try {
      if (chain === 'ethereum') {
        Logger.info('Ethereum transaction history requested', { address, limit });
        return [];
      } else {
        Logger.info('Tezos transaction history requested', { address, limit });
        return [];
      }
    } catch (error) {
      Logger.error('Failed to get transaction history', { chain, address, error });
      return [];
    }
  }

  static startBlockSubscription(): void {
    Logger.info('Starting block subscription for both chains');

    this.ethereumProvider.on('block', async (blockNumber) => {
      Logger.debug('New Ethereum block', { blockNumber });
      await this.monitorPendingTransactions();
    });

    setInterval(async () => {
      try {
        const currentBlock = await this.tezosToolkit.rpc.getBlockHeader();
        Logger.debug('Tezos block check', { level: currentBlock.level });
      } catch (error) {
        Logger.error('Tezos block subscription error', error);
      }
    }, 15000);
  }

  static async healthCheck(): Promise<{ ethereum: boolean; tezos: boolean }> {
    try {
      const [ethCheck, tezCheck] = await Promise.all([
        this.ethereumProvider.getBlockNumber().then(() => true).catch(() => false),
        this.tezosToolkit.rpc.getBlockHeader().then(() => true).catch(() => false)
      ]);

      return {
        ethereum: ethCheck,
        tezos: tezCheck
      };
    } catch (error) {
      Logger.error('Blockchain health check failed', error);
      return { ethereum: false, tezos: false };
    }
  }
}