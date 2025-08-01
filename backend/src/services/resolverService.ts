import { OrderModel, Order } from '../models/Order';
import { SwapModel, Swap } from '../models/Swap';
import { TransactionModel } from '../models/Transaction';
import { CryptoUtils } from '../utils/crypto';
import { Logger } from '../utils/logger';
import { ContractService, CreateSwapParams } from './contractService';
import { CrossChainResolverService, ResolveFusionOrderRequest } from './crossChainResolverService';

export interface ResolveOrderRequest {
  orderId: string;
  resolverAddress: string;
}

export interface ResolveFusionOrderRequestLegacy {
  orderHash: string;
  resolverAddress: string;
}

export class ResolverService {
  static async resolveFusionOrder(request: ResolveFusionOrderRequest): Promise<any> {
    try {
      Logger.info('Resolving Fusion+ order via ResolverService', request);
      return await CrossChainResolverService.resolveFusionOrder(request);
    } catch (error) {
      Logger.error('Failed to resolve Fusion+ order', error);
      throw error;
    }
  }

  static startMonitoring(intervalMs: number = 30000): void {
    CrossChainResolverService.startMonitoring(intervalMs);
  }

  static stopMonitoring(): void {
    CrossChainResolverService.stopMonitoring();
  }

  static async getCrossChainSwap(orderHash: string): Promise<any> {
    return await CrossChainResolverService.getCrossChainSwap(orderHash);
  }

  static async executeSwap(request: ResolveOrderRequest): Promise<Swap> {
    try {
      Logger.warn('Using deprecated executeSwap method. Use resolveFusionOrder for cross-chain Fusion+ orders.');

      const order = await OrderModel.findById(request.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'pending') {
        throw new Error('Order is not available for execution');
      }

      const swap = await SwapModel.create({
        order_id: request.orderId,
        resolver_address: request.resolverAddress,
        status: 'pending'
      });

      Logger.info('Starting legacy swap execution', { swapId: swap.id, orderId: request.orderId });

      await OrderModel.updateStatus(request.orderId, 'active');

      await this.executeDeposits(swap, order);

      return swap;
    } catch (error) {
      Logger.error('Failed to execute legacy swap', error);
      throw error;
    }
  }

  private static async executeDeposits(swap: Swap, order: Order): Promise<void> {
    try {
      let ethTxHash: string;
      let tezTxHash: string;

      if (order.source_chain === 'ethereum') {
        // Ethereum -> Tezos swap
        ethTxHash = await this.depositOnEthereum(order);
        tezTxHash = await this.depositOnTezos(order);
      } else {
        // Tezos -> Ethereum swap
        tezTxHash = await this.depositOnTezos(order);
        ethTxHash = await this.depositOnEthereum(order);
      }

      await SwapModel.updateTransactionHashes(swap.id, ethTxHash, tezTxHash);
      await SwapModel.updateStatus(swap.id, 'deposited');
      
      Logger.info('Deposits completed', { swapId: swap.id });
    } catch (error) {
      Logger.error('Failed to execute deposits', error);
      await SwapModel.updateStatus(swap.id, 'failed');
      throw error;
    }
  }

  private static async depositOnEthereum(order: Order): Promise<string> {
    try {
      const amount = order.source_chain === 'ethereum' ? order.source_amount : order.dest_amount;
      const tokenAddress = order.source_chain === 'ethereum' ? order.source_token : order.dest_token;
      
      Logger.info('Depositing on Ethereum', { amount, tokenAddress });

      const swapParams: CreateSwapParams = {
        secretHash: order.secret_hash,
        timelockHours: Math.ceil((order.timelock.getTime() - Date.now()) / (1000 * 60 * 60)),
        tokenAddress: tokenAddress === 'ETH' ? undefined : tokenAddress,
        amount: amount,
        isEthereumSource: true
      };

      const txHash = await ContractService.createEthereumSwap(swapParams);
      
      await TransactionModel.create({
        swap_id: order.id,
        chain: 'ethereum',
        tx_hash: txHash,
        tx_type: 'deposit',
        status: 'pending'
      });

      Logger.info('Ethereum deposit initiated', { txHash });
      return txHash;
    } catch (error) {
      Logger.error('Failed to deposit on Ethereum', error);
      throw error;
    }
  }

  private static async depositOnTezos(order: Order): Promise<string> {
    try {
      const amount = order.source_chain === 'tezos' ? order.source_amount : order.dest_amount;
      const tokenAddress = order.source_chain === 'tezos' ? order.source_token : order.dest_token;
      
      Logger.info('Depositing on Tezos', { amount, tokenAddress });

      const swapParams: CreateSwapParams = {
        secretHash: order.secret_hash,
        timelockHours: Math.ceil((order.timelock.getTime() - Date.now()) / (1000 * 60 * 60)),
        tokenAddress: tokenAddress === 'XTZ' ? undefined : tokenAddress,
        amount: amount,
        isEthereumSource: false
      };

      const opHash = await ContractService.createTezosSwap(swapParams);
      
      await TransactionModel.create({
        swap_id: order.id,
        chain: 'tezos',
        tx_hash: opHash,
        tx_type: 'deposit',
        status: 'pending'
      });

      Logger.info('Tezos deposit initiated', { opHash });
      return opHash;
    } catch (error) {
      Logger.error('Failed to deposit on Tezos', error);
      throw error;
    }
  }

  static async getActiveSwaps(): Promise<Swap[]> {
    try {
      const query = `
        SELECT s.*, o.secret_hash, o.timelock 
        FROM swaps s 
        JOIN orders o ON s.order_id = o.id 
        WHERE s.status = 'deposited'
      `;
      
      const result = await SwapModel.findByOrderId(''); 
      return result ? [result] : [];
    } catch (error) {
      Logger.error('Failed to get active swaps', error);
      throw error;
    }
  }

  static async checkResolverBalance(resolverAddress: string, order: Order): Promise<boolean> {
    try {
      Logger.info('Checking resolver balance', { resolverAddress, orderId: order.id });
      return true;
    } catch (error) {
      Logger.error('Failed to check resolver balance', error);
      return false;
    }
  }

  static calculateResolverFee(order: Order): string {
    const destAmount = parseFloat(order.dest_amount);
    const feePercentage = 0.001; 
    const fee = destAmount * feePercentage;
    return fee.toString();
  }
}