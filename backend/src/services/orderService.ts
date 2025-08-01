import { OrderModel, Order } from '../models/Order';
import { CryptoUtils } from '../utils/crypto';
import { Logger } from '../utils/logger';
import { FusionOrderService, FusionOrderCreationParams } from './fusionOrderService';

export interface CreateOrderRequest {
  makerAddress: string;
  sourceChain: string;
  destChain: string;
  sourceToken: string;
  destToken: string;
  sourceAmount: string;
  destAmount: string;
  timelockMinutes: number;
  tezosRecipient?: string;
}

export class OrderService {

  static async createCrossChainOrder(request: CreateOrderRequest): Promise<any> {
    try {
      if (request.sourceChain === 'ethereum' && request.destChain === 'tezos') {
        if (!request.tezosRecipient) {
          throw new Error('Tezos recipient address is required for cross-chain orders');
        }

        // Use Fusion+ for Ethereum -> Tezos swaps
        const fusionParams: FusionOrderCreationParams = {
          makerAddress: request.makerAddress,
          sourceToken: request.sourceToken,
          destToken: request.destToken,
          sourceAmount: request.sourceAmount,
          destAmount: request.destAmount,
          tezosRecipient: request.tezosRecipient,
          timelockHours: Math.ceil(request.timelockMinutes / 60), 
          auctionDuration: 180 
        };

        const fusionOrder = await FusionOrderService.createCrossChainOrder(fusionParams);
        Logger.info('Cross-chain Fusion+ order created', { 
          orderHash: fusionOrder.orderHash,
          targetChain: fusionOrder.crossChainData.targetChain
        });

        return fusionOrder;
      } else if (request.sourceChain === 'tezos' && request.destChain === 'ethereum') {
        throw new Error('Tezos -> Ethereum flow not yet implemented');
      } else {
        throw new Error('Unsupported cross-chain pair');
      }
    } catch (error) {
      Logger.error('Failed to create cross-chain order', error);
      throw error;
    }
  }

  static async createOrder(request: CreateOrderRequest): Promise<Order> {
    try {
      Logger.warn('Using legacy order creation method. Consider using createCrossChainOrder for better cross-chain support.');
      
      const secret = CryptoUtils.generateSecret();
      const secretHash = CryptoUtils.createHash(secret);
      
      const timelock = new Date(Date.now() + request.timelockMinutes * 60 * 1000);
      
      const order = await OrderModel.create({
        maker_address: request.makerAddress,
        source_chain: request.sourceChain,
        dest_chain: request.destChain,
        source_token: request.sourceToken,
        dest_token: request.destToken,
        source_amount: request.sourceAmount,
        dest_amount: request.destAmount,
        secret_hash: secretHash,
        timelock: timelock,
        status: 'pending'
      });

      Logger.info('Legacy order created', { orderId: order.id, secretHash });
      
      return order;
    } catch (error) {
      Logger.error('Failed to create legacy order', error);
      throw error;
    }
  }

  static async getOrder(orderId: string): Promise<Order | null> {
    try {
      return await OrderModel.findById(orderId);
    } catch (error) {
      Logger.error('Failed to get order', error);
      throw error;
    }
  }

  static async getActiveOrders(): Promise<Order[]> {
    try {
      return await OrderModel.findByStatus('active');
    } catch (error) {
      Logger.error('Failed to get active orders', error);
      throw error;
    }
  }

  static async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order | null> {
    try {
      return await OrderModel.updateStatus(orderId, status);
    } catch (error) {
      Logger.error('Failed to update order status', error);
      throw error;
    }
  }

  static async getExpiredOrders(): Promise<Order[]> {
    try {
      return await OrderModel.findExpired();
    } catch (error) {
      Logger.error('Failed to get expired orders', error);
      throw error;
    }
  }
} 