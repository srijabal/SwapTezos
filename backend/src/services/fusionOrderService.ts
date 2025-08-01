import { v4 as uuidv4 } from 'uuid';
import { FusionConfig, CrossChainOrderParams, FusionOrderWithCrossChainData } from '../config/fusion';
import { DatabaseService } from '../utils/database-setup';
import { Logger } from '../utils/logger';
import { generateSecretHash } from '../utils/crypto';

export interface FusionOrderCreationParams {
  makerAddress: string;
  sourceToken: string;
  destToken: string; 
  sourceAmount: string;
  destAmount: string;
  tezosRecipient: string;
  timelockHours: number;
  auctionDuration?: number; 
}

export interface FusionOrderStatus {
  orderHash: string;
  status: 'created' | 'matched' | 'filled' | 'cancelled' | 'expired';
  fusionStatus: any; 
  crossChainSwapId?: string;
  secretHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FusionOrderService {
  private static db = DatabaseService.getInstance();

  public static async createCrossChainOrder(params: FusionOrderCreationParams): Promise<FusionOrderWithCrossChainData> {
    try {
      Logger.info('Creating cross-chain Fusion+ order', { params });

      const { secretHash, secret } = generateSecretHash();

      const fusionSDK = FusionConfig.getInstance();

      const fusionOrderParams = {
        makerAsset: params.sourceToken,
        takerAsset: '0x0000000000000000000000000000000000000000', 
        makingAmount: params.sourceAmount,
        takingAmount: params.destAmount,
        maker: params.makerAddress,
        customData: {
          targetChain: 'tezos' as const,
          secretHash,
          tezosRecipient: params.tezosRecipient,
          timelockHours: params.timelockHours,
          destToken: params.destToken
        }
      };

      const quote = await fusionSDK.getQuote(fusionOrderParams);
      Logger.info('Fusion+ quote received', { quote });

      const preparedOrder = await fusionSDK.createOrder(fusionOrderParams);
      Logger.info('Fusion+ order prepared', { orderHash: preparedOrder.order.orderHash });

      const submissionResult = await fusionSDK.submitOrder(preparedOrder.order, quote.quoteId);
      Logger.info('Fusion+ order submitted', { submissionResult });

      const orderId = uuidv4();
      const dbOrder = {
        id: orderId,
        fusion_order_hash: preparedOrder.order.orderHash,
        maker_address: params.makerAddress,
        source_chain: 'ethereum',
        dest_chain: 'tezos',
        source_token: params.sourceToken,
        dest_token: params.destToken,
        source_amount: params.sourceAmount,
        dest_amount: params.destAmount,
        secret_hash: secretHash,
        fusion_auction_start_time: new Date(),
        fusion_auction_duration: params.auctionDuration || 180, // Default 3 minutes
        tezos_timelock_hours: params.timelockHours,
        status: 'created'
      };

      await this.db.query(`
        INSERT INTO fusion_orders (
          id, fusion_order_hash, maker_address, source_chain, dest_chain,
          source_token, dest_token, source_amount, dest_amount, secret_hash,
          fusion_auction_start_time, fusion_auction_duration, tezos_timelock_hours, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        dbOrder.id, dbOrder.fusion_order_hash, dbOrder.maker_address,
        dbOrder.source_chain, dbOrder.dest_chain, dbOrder.source_token,
        dbOrder.dest_token, dbOrder.source_amount, dbOrder.dest_amount,
        dbOrder.secret_hash, dbOrder.fusion_auction_start_time,
        dbOrder.fusion_auction_duration, dbOrder.tezos_timelock_hours, dbOrder.status
      ]);

      await this.storeOrderSecret(preparedOrder.order.orderHash, secret);

      return {
        orderHash: preparedOrder.order.orderHash,
        fusionOrder: preparedOrder.order,
        crossChainData: {
          targetChain: 'tezos',
          secretHash,
          tezosRecipient: params.tezosRecipient,
          timelockHours: params.timelockHours
        }
      };

    } catch (error) {
      Logger.error('Failed to create cross-chain Fusion+ order', error);
      throw error;
    }
  }

  public static async getOrderStatus(orderHash: string): Promise<FusionOrderStatus | null> {
    try {
      const dbResult = await this.db.query(
        'SELECT * FROM fusion_orders WHERE fusion_order_hash = $1',
        [orderHash]
      );

      if (dbResult.rows.length === 0) {
        return null;
      }

      const localOrder = dbResult.rows[0];

      const fusionSDK = FusionConfig.getInstance();
      const fusionStatus = await fusionSDK.getOrderStatus(orderHash);

      const swapResult = await this.db.query(
        'SELECT id FROM cross_chain_swaps WHERE fusion_order_id = $1',
        [localOrder.id]
      );

      return {
        orderHash,
        status: localOrder.status,
        fusionStatus,
        crossChainSwapId: swapResult.rows[0]?.id,
        secretHash: localOrder.secret_hash,
        createdAt: localOrder.created_at,
        updatedAt: localOrder.updated_at || localOrder.created_at
      };

    } catch (error) {
      Logger.error('Failed to get order status', error);
      throw error;
    }
  }

  public static async listOrders(limit = 50, offset = 0): Promise<FusionOrderStatus[]> {
    try {
      const result = await this.db.query(`
        SELECT fo.*, ccs.id as swap_id 
        FROM fusion_orders fo
        LEFT JOIN cross_chain_swaps ccs ON fo.id = ccs.fusion_order_id
        ORDER BY fo.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      const orders: FusionOrderStatus[] = [];
      
      for (const row of result.rows) {
        try {
          const fusionSDK = FusionConfig.getInstance();
          const fusionStatus = await fusionSDK.getOrderStatus(row.fusion_order_hash);

          orders.push({
            orderHash: row.fusion_order_hash,
            status: row.status,
            fusionStatus,
            crossChainSwapId: row.swap_id,
            secretHash: row.secret_hash,
            createdAt: row.created_at,
            updatedAt: row.updated_at || row.created_at
          });
        } catch (statusError) {
          Logger.warn('Failed to get fusion status for order', { 
            orderHash: row.fusion_order_hash, 
            error: statusError 
          });
          
          orders.push({
            orderHash: row.fusion_order_hash,
            status: row.status,
            fusionStatus: null,
            crossChainSwapId: row.swap_id,
            secretHash: row.secret_hash,
            createdAt: row.created_at,
            updatedAt: row.updated_at || row.created_at
          });
        }
      }

      return orders;
    } catch (error) {
      Logger.error('Failed to list orders', error);
      throw error;
    }
  }

  public static async cancelOrder(orderHash: string): Promise<boolean> {
    try {
      await this.db.query(
        'UPDATE fusion_orders SET status = $1, updated_at = NOW() WHERE fusion_order_hash = $2',
        ['cancelled', orderHash]
      );

      Logger.info('Order marked as cancelled', { orderHash });
      
      return true;
    } catch (error) {
      Logger.error('Failed to cancel order', error);
      throw error;
    }
  }

  public static async updateOrderStatus(orderHash: string, newStatus: string): Promise<void> {
    try {
      await this.db.query(`
        UPDATE fusion_orders 
        SET status = $1, updated_at = NOW() 
        WHERE fusion_order_hash = $2
      `, [newStatus, orderHash]);

      Logger.info('Order status updated', { orderHash, newStatus });
    } catch (error) {
      Logger.error('Failed to update order status', error);
      throw error;
    }
  }

  public static async getOrdersReadyForResolution(): Promise<any[]> {
    try {
      const result = await this.db.query(`
        SELECT fo.* FROM fusion_orders fo
        LEFT JOIN cross_chain_swaps ccs ON fo.id = ccs.fusion_order_id
        WHERE fo.status IN ('matched', 'filled') 
        AND ccs.id IS NULL
        ORDER BY fo.created_at ASC
      `);

      return result.rows;
    } catch (error) {
      Logger.error('Failed to get orders ready for resolution', error);
      throw error;
    }
  }


  private static async storeOrderSecret(orderHash: string, secret: string): Promise<void> {
    try {

      await this.db.query(`
        CREATE TABLE IF NOT EXISTS order_secrets (
          order_hash VARCHAR(66) PRIMARY KEY,
          secret VARCHAR(66) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await this.db.query(
        'INSERT INTO order_secrets (order_hash, secret) VALUES ($1, $2)',
        [orderHash, secret]
      );
    } catch (error) {
      Logger.error('Failed to store order secret', error);
      throw error;
    }
  }

              
  public static async getOrderSecret(orderHash: string): Promise<string | null> {
    try {
      const result = await this.db.query(
        'SELECT secret FROM order_secrets WHERE order_hash = $1',
        [orderHash]
      );

      return result.rows[0]?.secret || null;
    } catch (error) {
      Logger.error('Failed to retrieve order secret', error);
      throw error;
    }
  }
}