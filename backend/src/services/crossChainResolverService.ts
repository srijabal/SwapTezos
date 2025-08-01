import { v4 as uuidv4 } from 'uuid';
import { FusionConfig } from '../config/fusion';
import { FusionOrderService } from './fusionOrderService';
import { DatabaseService } from '../utils/database-setup';
import { Logger } from '../utils/logger';
import { ContractService } from './contractService';
import { TezosConfig } from '../config/tezos';

export interface ResolveFusionOrderRequest {
  orderHash: string;
  resolverAddress: string;
}

export interface CrossChainSwapExecution {
  swapId: string;
  fusionOrderHash: string;
  tezosHTLCAddress?: string;
  tezosHTLCId?: number;
  status: 'initiated' | 'deposited' | 'revealed' | 'claimed' | 'refunded' | 'failed';
}

export class CrossChainResolverService {
  private static db = DatabaseService.getInstance();
  private static monitoringInterval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring for Fusion+ orders ready for cross-chain resolution
   */
  public static startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    Logger.info('Starting cross-chain resolver monitoring', { intervalMs });

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForResolutionOpportunities();
      } catch (error) {
        Logger.error('Error in resolver monitoring cycle', error);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  public static stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      Logger.info('Cross-chain resolver monitoring stopped');
    }
  }

  /**
   * Manually resolve a Fusion+ order by creating corresponding Tezos HTLC
   */
  public static async resolveFusionOrder(request: ResolveFusionOrderRequest): Promise<CrossChainSwapExecution> {
    try {
      Logger.info('Resolving Fusion+ order', { orderHash: request.orderHash });

      // Get Fusion+ order details
      const fusionOrder = await FusionOrderService.getOrderStatus(request.orderHash);
      if (!fusionOrder) {
        throw new Error('Fusion+ order not found');
      }

      // Check if order is ready for resolution
      if (fusionOrder.fusionStatus?.status !== 'filled') {
        throw new Error(`Order not ready for resolution. Status: ${fusionOrder.fusionStatus?.status}`);
      }

      // Check if already being resolved
      const existingSwap = await this.getCrossChainSwap(request.orderHash);
      if (existingSwap) {
        throw new Error('Order already being resolved');
      }

      // Get the fusion order details from database
      const dbOrderResult = await this.db.query(
        'SELECT * FROM fusion_orders WHERE fusion_order_hash = $1',
        [request.orderHash]
      );

      if (dbOrderResult.rows.length === 0) {
        throw new Error('Fusion order not found in local database');
      }

      const fusionOrderData = dbOrderResult.rows[0];

      // Create cross-chain swap record
      const swapId = uuidv4();
      await this.db.query(`
        INSERT INTO cross_chain_swaps (
          id, fusion_order_id, resolver_address, status
        ) VALUES ($1, $2, $3, $4)
      `, [swapId, fusionOrderData.id, request.resolverAddress, 'initiated']);

      // Create corresponding HTLC on Tezos
      const tezosResult = await this.createTezosHTLC(fusionOrderData);

      // Update swap with Tezos HTLC details
      await this.db.query(`
        UPDATE cross_chain_swaps 
        SET tezos_htlc_address = $1, tezos_htlc_id = $2, tezos_deposit_hash = $3, status = $4, updated_at = NOW()
        WHERE id = $5
      `, [tezosResult.contractAddress, tezosResult.htlcId, tezosResult.operationHash, 'deposited', swapId]);

      // Update fusion order status
      await FusionOrderService.updateOrderStatus(request.orderHash, 'matched');

      Logger.info('Cross-chain swap initiated', {
        swapId,
        orderHash: request.orderHash,
        tezosHTLC: tezosResult.contractAddress,
        htlcId: tezosResult.htlcId
      });

      return {
        swapId,
        fusionOrderHash: request.orderHash,
        tezosHTLCAddress: tezosResult.contractAddress,
        tezosHTLCId: tezosResult.htlcId,
        status: 'deposited'
      };

    } catch (error) {
      Logger.error('Failed to resolve Fusion+ order', error);
      throw error;
    }
  }

  /**
   * Create HTLC on Tezos corresponding to Fusion+ order
   */
  private static async createTezosHTLC(fusionOrderData: any): Promise<{
    contractAddress: string;
    htlcId: number;
    operationHash: string;
  }> {
    try {
      Logger.info('Creating Tezos HTLC', {
        secretHash: fusionOrderData.secret_hash,
        amount: fusionOrderData.dest_amount,
        timelockHours: fusionOrderData.tezos_timelock_hours
      });

      // Use Tezos configuration to get the deployed HTLC contract
      const tezosConfig = TezosConfig.getInstance();
      const toolkit = await tezosConfig.getToolkit();
      
      // Get deployed HTLC contract address (should be in environment or config)
      const htlcContractAddress = process.env.TEZOS_HTLC_CONTRACT_ADDRESS;
      if (!htlcContractAddress) {
        throw new Error('TEZOS_HTLC_CONTRACT_ADDRESS not configured');
      }

      const contract = await toolkit.contract.at(htlcContractAddress);

      // Create HTLC swap
      const operation = await contract.methods.create_swap(
        null, // taker (open to anyone)
        fusionOrderData.secret_hash,
        fusionOrderData.tezos_timelock_hours,
        null, // token_address (null for Tez)
        null, // token_id
        null  // token_amount
      ).send({
        amount: Math.floor(parseFloat(fusionOrderData.dest_amount) * 1000000), // Convert to mutez
        mutez: true
      });

      await operation.confirmation(2);

      // Get the HTLC ID from contract storage (simplified - in reality you'd parse events)
      const storage: any = await contract.storage();
      const htlcId = storage.next_swap_id - 1; // Assuming auto-incrementing IDs

      Logger.info('Tezos HTLC created successfully', {
        contractAddress: htlcContractAddress,
        htlcId,
        operationHash: operation.hash
      });

      return {
        contractAddress: htlcContractAddress,
        htlcId,
        operationHash: operation.hash
      };

    } catch (error) {
      Logger.error('Failed to create Tezos HTLC', error);
      throw error;
    }
  }

  /**
   * Monitor cross-chain swaps and reveal secrets when both sides are deposited
   */
  public static async monitorAndRevealSecrets(): Promise<void> {
    try {
      // Get all swaps in 'deposited' status
      const result = await this.db.query(`
        SELECT ccs.*, fo.fusion_order_hash, fo.secret_hash
        FROM cross_chain_swaps ccs
        JOIN fusion_orders fo ON ccs.fusion_order_id = fo.id
        WHERE ccs.status = 'deposited'
      `);

      for (const swap of result.rows) {
        try {
          await this.checkAndRevealSecret(swap);
        } catch (error) {
          Logger.error('Failed to process swap for secret revelation', {
            swapId: swap.id,
            error
          });
        }
      }
    } catch (error) {
      Logger.error('Failed to monitor and reveal secrets', error);
    }
  }

  /**
   * Check if both sides are deposited and reveal secret if ready
   */
  private static async checkAndRevealSecret(swap: any): Promise<void> {
    try {
      // Check Fusion+ settlement status
      const fusionSDK = FusionConfig.getInstance();
      const fusionStatus = await fusionSDK.getOrderStatus(swap.fusion_order_hash);
      
      const fusionSettled = fusionStatus?.status === 'filled';
      
      // Check Tezos HTLC deposit status
      const tezosDeposited = await this.checkTezosHTLCStatus(swap.tezos_htlc_address, swap.tezos_htlc_id);

      if (fusionSettled && tezosDeposited) {
        Logger.info('Both sides deposited, revealing secret', {
          swapId: swap.id,
          orderHash: swap.fusion_order_hash
        });

        await this.revealSecretAndClaim(swap);
      } else {
        Logger.debug('Waiting for both sides to be deposited', {
          swapId: swap.id,
          fusionSettled,
          tezosDeposited
        });
      }
    } catch (error) {
      Logger.error('Failed to check and reveal secret', error);
    }
  }

  /**
   * Check Tezos HTLC status
   */
  private static async checkTezosHTLCStatus(contractAddress: string, htlcId: number): Promise<boolean> {
    try {
      const tezosConfig = TezosConfig.getInstance();
      const toolkit = await tezosConfig.getToolkit();
      
      const contract = await toolkit.contract.at(contractAddress);
      const storage: any = await contract.storage();
      
      const htlc = storage.swaps.get(htlcId.toString());
      return htlc && htlc.status === 'active';
    } catch (error) {
      Logger.warn('Failed to check Tezos HTLC status', error);
      return false;
    }
  }

  /**
   * Reveal secret and trigger claims on both chains
   */
  private static async revealSecretAndClaim(swap: any): Promise<void> {
    try {
      // Get the secret from secure storage
      const secret = await FusionOrderService.getOrderSecret(swap.fusion_order_hash);
      if (!secret) {
        throw new Error('Secret not found for order');
      }

      // Claim on Tezos (this reveals the secret onchain)
      await this.claimTezosHTLC(swap.tezos_htlc_address, swap.tezos_htlc_id, secret);

      // Update swap status
      await this.db.query(`
        UPDATE cross_chain_swaps 
        SET secret = $1, secret_revealed_at = NOW(), status = $2, updated_at = NOW()
        WHERE id = $3
      `, [secret, 'revealed', swap.id]);

      // Update fusion order status
      await FusionOrderService.updateOrderStatus(swap.fusion_order_hash, 'resolved');

      Logger.info('Secret revealed and claims initiated', {
        swapId: swap.id,
        orderHash: swap.fusion_order_hash
      });

    } catch (error) {
      Logger.error('Failed to reveal secret and claim', error);
      
      // Update swap status to failed
      await this.db.query(`
        UPDATE cross_chain_swaps 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `, ['failed', swap.id]);
    }
  }

  /**
   * Claim HTLC on Tezos
   */
  private static async claimTezosHTLC(contractAddress: string, htlcId: number, secret: string): Promise<void> {
    try {
      const tezosConfig = TezosConfig.getInstance();
      const toolkit = await tezosConfig.getToolkit();
      
      const contract = await toolkit.contract.at(contractAddress);

      const operation = await contract.methods.claim_swap(
        htlcId,
        secret
      ).send();

      await operation.confirmation(2);

      Logger.info('Tezos HTLC claimed successfully', {
        contractAddress,
        htlcId,
        operationHash: operation.hash
      });

    } catch (error) {
      Logger.error('Failed to claim Tezos HTLC', error);
      throw error;
    }
  }

  /**
   * Check for new resolution opportunities
   */
  private static async checkForResolutionOpportunities(): Promise<void> {
    try {
      const opportunities = await FusionOrderService.getOrdersReadyForResolution();
      
      if (opportunities.length > 0) {
        Logger.info(`Found ${opportunities.length} orders ready for resolution`);
        
        // For demo purposes, we'll auto-resolve with a default resolver
        // In production, this would notify registered resolvers
        const defaultResolver = process.env.DEFAULT_RESOLVER_ADDRESS;
        
        if (defaultResolver) {
          for (const order of opportunities.slice(0, 3)) { // Limit to 3 at a time
            try {
              await this.resolveFusionOrder({
                orderHash: order.fusion_order_hash,
                resolverAddress: defaultResolver
              });
            } catch (error) {
              Logger.warn('Failed to auto-resolve order', {
                orderHash: order.fusion_order_hash,
                error: error.message
              });
            }
          }
        }
      }

      // Also monitor existing swaps for secret revelation
      await this.monitorAndRevealSecrets();
      
    } catch (error) {
      Logger.error('Failed to check for resolution opportunities', error);
    }
  }

  /**
   * Get cross-chain swap by fusion order hash
   */
  public static async getCrossChainSwap(orderHash: string): Promise<any> {
    try {
      const result = await this.db.query(`
        SELECT ccs.*, fo.fusion_order_hash 
        FROM cross_chain_swaps ccs
        JOIN fusion_orders fo ON ccs.fusion_order_id = fo.id
        WHERE fo.fusion_order_hash = $1
      `, [orderHash]);

      return result.rows[0] || null;
    } catch (error) {
      Logger.error('Failed to get cross-chain swap', error);
      return null;
    }
  }

  /**
   * Get swap execution details
   */
  public static async getSwapExecution(swapId: string): Promise<CrossChainSwapExecution | null> {
    try {
      const result = await this.db.query(`
        SELECT ccs.*, fo.fusion_order_hash 
        FROM cross_chain_swaps ccs
        JOIN fusion_orders fo ON ccs.fusion_order_id = fo.id
        WHERE ccs.id = $1
      `, [swapId]);

      if (result.rows.length === 0) {
        return null;
      }

      const swap = result.rows[0];
      return {
        swapId: swap.id,
        fusionOrderHash: swap.fusion_order_hash,
        tezosHTLCAddress: swap.tezos_htlc_address,
        tezosHTLCId: swap.tezos_htlc_id,
        status: swap.status
      };
    } catch (error) {
      Logger.error('Failed to get swap execution', error);
      return null;
    }
  }

  /**
   * Handle timeout scenarios - refund both sides
   */
  public static async handleTimeouts(): Promise<void> {
    try {
      // Find swaps that have exceeded their timelock
      const result = await this.db.query(`
        SELECT ccs.*, fo.fusion_order_hash, fo.tezos_timelock_hours, fo.fusion_auction_start_time
        FROM cross_chain_swaps ccs
        JOIN fusion_orders fo ON ccs.fusion_order_id = fo.id
        WHERE ccs.status IN ('deposited', 'revealed')
        AND fo.fusion_auction_start_time + INTERVAL '1 hour' * fo.tezos_timelock_hours < NOW()
      `);

      for (const swap of result.rows) {
        try {
          await this.refundExpiredSwap(swap);
        } catch (error) {
          Logger.error('Failed to refund expired swap', {
            swapId: swap.id,
            error
          });
        }
      }
    } catch (error) {
      Logger.error('Failed to handle timeouts', error);
    }
  }

  /**
   * Refund expired swap
   */
  private static async refundExpiredSwap(swap: any): Promise<void> {
    try {
      Logger.info('Refunding expired swap', {
        swapId: swap.id,
        orderHash: swap.fusion_order_hash
      });

      // Refund Tezos HTLC if it exists
      if (swap.tezos_htlc_address && swap.tezos_htlc_id) {
        await this.refundTezosHTLC(swap.tezos_htlc_address, swap.tezos_htlc_id);
      }

      // Update swap status
      await this.db.query(`
        UPDATE cross_chain_swaps 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `, ['refunded', swap.id]);

      // Update fusion order status
      await FusionOrderService.updateOrderStatus(swap.fusion_order_hash, 'cancelled');

    } catch (error) {
      Logger.error('Failed to refund expired swap', error);
    }
  }

  /**
   * Refund Tezos HTLC
   */
  private static async refundTezosHTLC(contractAddress: string, htlcId: number): Promise<void> {
    try {
      const tezosConfig = TezosConfig.getInstance();
      const toolkit = await tezosConfig.getToolkit();
      
      const contract = await toolkit.contract.at(contractAddress);

      const operation = await contract.methods.refund_swap(htlcId).send();
      await operation.confirmation(2);

      Logger.info('Tezos HTLC refunded successfully', {
        contractAddress,
        htlcId,
        operationHash: operation.hash
      });

    } catch (error) {
      Logger.error('Failed to refund Tezos HTLC', error);
      throw error;
    }
  }
}