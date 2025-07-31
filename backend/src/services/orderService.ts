import { OrderModel, Order } from '../models/Order';
import { CryptoUtils } from '../utils/crypto';
import { Logger } from '../utils/logger';

export interface CreateOrderRequest {
  makerAddress: string;
  sourceChain: string;
  destChain: string;
  sourceToken: string;
  destToken: string;
  sourceAmount: string;
  destAmount: string;
  timelockMinutes: number;
}

export class OrderService {

  static async createOrder(request: CreateOrderRequest): Promise<Order> {
    try {
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

      Logger.info('Order created', { orderId: order.id, secretHash });
      
      return order;
    } catch (error) {
      Logger.error('Failed to create order', error);
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