import { SwapModel, Swap } from '../models/Swap';
import { OrderModel } from '../models/Order';
import { TransactionModel } from '../models/Transaction';
import { CryptoUtils } from '../utils/crypto';
import { Logger } from '../utils/logger';
import { ContractService } from './contractService';

export class RelayerService {
  static async monitorAndRevealSecrets(): Promise<void> {
    try {
      const activeSwaps = await this.getActiveSwaps();
      
      for (const swap of activeSwaps) {
        await this.processSwap(swap);
      }
    } catch (error) {
      Logger.error('Failed to monitor and reveal secrets', error);
    }
  }

  private static async processSwap(swap: Swap): Promise<void> {
    try {
      const order = await OrderModel.findById(swap.order_id);
      if (!order) {
        Logger.error('Order not found for swap', { swapId: swap.id });
        return;
      }

      const ethConfirmed = await this.isTransactionConfirmed('ethereum', swap.ethereum_tx_hash);
      const tezConfirmed = await this.isTransactionConfirmed('tezos', swap.tezos_tx_hash);

      if (ethConfirmed && tezConfirmed) {
        Logger.info('Both deposits confirmed, revealing secret', { swapId: swap.id });
        await this.revealSecret(swap.id, order.secret_hash);
      } else {
        Logger.debug('Waiting for confirmations', { 
          swapId: swap.id,
          ethConfirmed,
          tezConfirmed 
        });
      }
    } catch (error) {
      Logger.error('Failed to process swap', { swapId: swap.id, error });
    }
  }

  private static async isTransactionConfirmed(chain: 'ethereum' | 'tezos', txHash?: string): Promise<boolean> {
    if (!txHash) return false;

    try {
      if (chain === 'ethereum') {
        const receipt = await ethereumProvider.getTransactionReceipt(txHash);
        if (receipt && receipt.confirmations >= 6) {
          await this.updateTransactionStatus(txHash, 'confirmed');
          return true;
        }
      } else if (chain === 'tezos') {
        Logger.debug('Checking Tezos transaction confirmation', { txHash });
        
        const transaction = await TransactionModel.findByTxHash(txHash);
        if (transaction && Date.now() - transaction.created_at.getTime() > 60000) { // 1 minute
          await this.updateTransactionStatus(txHash, 'confirmed');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      Logger.error('Failed to check transaction confirmation', { chain, txHash, error });
      return false;
    }
  }

  private static async updateTransactionStatus(txHash: string, status: 'confirmed' | 'failed'): Promise<void> {
    try {
      const transaction = await TransactionModel.findByTxHash(txHash);
      if (transaction) {
        await TransactionModel.updateStatus(transaction.id, status);
        Logger.info('Transaction status updated', { txHash, status });
      }
    } catch (error) {
      Logger.error('Failed to update transaction status', { txHash, error });
    }
  }

  private static async revealSecret(swapId: string, secretHash: string): Promise<void> {
    try {
      
      const secret = CryptoUtils.generateSecret();
      
      await SwapModel.updateSecret(swapId, secret);
      
      Logger.info('Secret revealed', { swapId, secretHash });
      
      await this.triggerClaimOperations(swapId, secret);
      
    } catch (error) {
      Logger.error('Failed to reveal secret', { swapId, error });
    }
  }

  private static async triggerClaimOperations(swapId: string, secret: string): Promise<void> {
    try {
      const swap = await SwapModel.findById(swapId);
      if (!swap) {
        throw new Error('Swap not found');
      }

      const ethClaimTx = await this.claimOnEthereum(swap, secret);
      const tezClaimTx = await this.claimOnTezos(swap, secret);

      if (ethClaimTx) {
        await TransactionModel.create({
          swap_id: swapId,
          chain: 'ethereum',
          tx_hash: ethClaimTx,
          tx_type: 'claim',
          status: 'pending'
        });
      }

      if (tezClaimTx) {
        await TransactionModel.create({
          swap_id: swapId,
          chain: 'tezos',
          tx_hash: tezClaimTx,
          tx_type: 'claim',
          status: 'pending'
        });
      }

      await SwapModel.updateStatus(swapId, 'claimed');
      
      Logger.info('Claim operations triggered', { swapId });
      
    } catch (error) {
      Logger.error('Failed to trigger claim operations', { swapId, error });
    }
  }

  private static async claimOnEthereum(swap: Swap, secret: string): Promise<string | null> {
    try {
      Logger.info('Claiming on Ethereum', { swapId: swap.id });
      
      
      const ethereumSwapId = await this.getEthereumSwapId(swap);
      if (!ethereumSwapId) {
        throw new Error('Ethereum swap ID not found');
      }
      
      const txHash = await ContractService.claimEthereumSwap(ethereumSwapId, secret);
      
      Logger.info('Ethereum claim initiated', { swapId: swap.id, txHash });
      return txHash;
      
    } catch (error) {
      Logger.error('Failed to claim on Ethereum', { swapId: swap.id, error });
      return null;
    }
  }

  private static async claimOnTezos(swap: Swap, secret: string): Promise<string | null> {
    try {
      Logger.info('Claiming on Tezos', { swapId: swap.id });
      
      const tezosSwapId = await this.getTezosSwapId(swap);
      if (!tezosSwapId) {
        throw new Error('Tezos swap ID not found');
      }
      
      const opHash = await ContractService.claimTezosSwap(tezosSwapId, secret);
      
      Logger.info('Tezos claim initiated', { swapId: swap.id, opHash });
      return opHash;
      
    } catch (error) {
      Logger.error('Failed to claim on Tezos', { swapId: swap.id, error });
      return null;
    }
  }

  static async processRefunds(): Promise<void> {
    try {
      const expiredOrders = await OrderModel.findExpired();
      
      for (const order of expiredOrders) {
        const swap = await SwapModel.findByOrderId(order.id);
        if (swap && swap.status === 'deposited') {
          await this.processRefund(swap);
        }
      }
    } catch (error) {
      Logger.error('Failed to process refunds', error);
    }
  }

  private static async processRefund(swap: Swap): Promise<void> {
    try {
      Logger.info('Processing refund for expired swap', { swapId: swap.id });

      const ethRefundTx = await this.refundOnEthereum(swap);
      const tezRefundTx = await this.refundOnTezos(swap);

      if (ethRefundTx) {
        await TransactionModel.create({
          swap_id: swap.id,
          chain: 'ethereum',
          tx_hash: ethRefundTx,
          tx_type: 'refund',
          status: 'pending'
        });
      }

      if (tezRefundTx) {
        await TransactionModel.create({
          swap_id: swap.id,
          chain: 'tezos',
          tx_hash: tezRefundTx,
          tx_type: 'refund',
          status: 'pending'
        });
      }

      await SwapModel.updateStatus(swap.id, 'refunded');
      await OrderModel.updateStatus(swap.order_id, 'expired');
      
      Logger.info('Refund processed', { swapId: swap.id });
      
    } catch (error) {
      Logger.error('Failed to process refund', { swapId: swap.id, error });
    }
  }
  private static async refundOnEthereum(swap: Swap): Promise<string | null> {
    try {
      const ethereumSwapId = await this.getEthereumSwapId(swap);
      if (!ethereumSwapId) {
        throw new Error('Ethereum swap ID not found');
      }
      
      const txHash = await ContractService.refundEthereumSwap(ethereumSwapId);
      Logger.info('Ethereum refund initiated', { swapId: swap.id, txHash });
      return txHash;
    } catch (error) {
      Logger.error('Failed to refund on Ethereum', { swapId: swap.id, error });
      return null;
    }
  }

  private static async refundOnTezos(swap: Swap): Promise<string | null> {
    try {
      const tezosSwapId = await this.getTezosSwapId(swap);
      if (!tezosSwapId) {
        throw new Error('Tezos swap ID not found');
      }
      
      const opHash = await ContractService.refundTezosSwap(tezosSwapId);
      Logger.info('Tezos refund initiated', { swapId: swap.id, opHash });
      return opHash;
    } catch (error) {
      Logger.error('Failed to refund on Tezos', { swapId: swap.id, error });
      return null;
    }
  }

  /**
   * Helper method to get Ethereum swap ID from our database swap
   * This would need to be implemented based on how you track contract swap IDs
   */
  private static async getEthereumSwapId(swap: Swap): Promise<number | null> {
    try {
      return 1; 
    } catch (error) {
      Logger.error('Failed to get Ethereum swap ID', { swapId: swap.id, error });
      return null;
    }
  }


  private static async getTezosSwapId(swap: Swap): Promise<number | null> {
    try {
      return 1; 
    } catch (error) {
      Logger.error('Failed to get Tezos swap ID', { swapId: swap.id, error });
      return null;
    }
  }

  private static async getActiveSwaps(): Promise<Swap[]> {
    try {
      return [];
    } catch (error) {
      Logger.error('Failed to get active swaps', error);
      return [];
    }
  }

  static startMonitoring(intervalMs: number = 30000): void {
    Logger.info('Starting relayer monitoring', { intervalMs });
    
    setInterval(async () => {
      await this.monitorAndRevealSecrets();
      await this.processRefunds();
    }, intervalMs);
  }
}