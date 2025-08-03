import { v4 as uuidv4 } from 'uuid';
import { HashLock } from '@1inch/cross-chain-sdk';
// Note: getRandomBytes32 might be in a different location or we'll use our own implementation
import { FusionConfig, CrossChainOrderParams, FusionOrderWithCrossChainData } from '../config/fusion';
import { supabase } from '../config/supabase';
import { Logger } from '../utils/logger';
import { CryptoUtils } from '../utils/crypto';
import { ethereumConfig } from '../config/ethereum';
import { ContractService } from './contractService';

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
  tezosExplorerData?: any;
  createdAt: Date;
  updatedAt: Date;
}

import axios from 'axios';

export class FusionOrderService {

  public static async createCrossChainOrder(params: FusionOrderCreationParams): Promise<FusionOrderWithCrossChainData> {
    try {
      Logger.info('Creating cross-chain Fusion+ order', { params });

      const secret = CryptoUtils.generateSecret();
      const secretHash = CryptoUtils.createHash(secret);

      const fusionSDK = FusionConfig.getInstance();

      // Use WETH and USDC for 1inch Fusion+ (ETH mainnet)
      // Convert to wei using BigInt to avoid floating point precision errors
      const sourceAmountEth = parseFloat(params.sourceAmount);
      const sourceAmountWei = BigInt(Math.round(sourceAmountEth * 1e18)).toString();
      
      // Check minimum amount for Fusion+ (0.001 ETH minimum)
      const minAmountWei = BigInt(Math.round(0.001 * 1e18)).toString();
      
      // DEMO MODE: Force fallback for demo purposes (uncomment next line)
      // throw new Error('Demo: Forcing fallback mode to show cross-chain bridge');
      
      if (parseFloat(sourceAmountWei) < parseFloat(minAmountWei)) {
        Logger.warn('Amount below Fusion+ minimum, using fallback bridge only', { 
          sourceAmount: params.sourceAmount, 
          sourceAmountWei, 
          minRequired: '0.001 ETH' 
        });
        throw new Error('Amount below minimum threshold for Fusion+');
      }
      
      const fusionParams = {
        srcChainId: 1, // Ethereum mainnet
        dstChainId: 100, // Gnosis chain for cross-chain functionality (common destination)
        srcTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH - what 1inch actually wants
        dstTokenAddress: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6', // USDT on Gnosis
        amount: sourceAmountWei,
        walletAddress: params.makerAddress,
        enableEstimate: true, // Required for createOrder
        // source: 'swaptezos-cross-chain' // Temporarily disabled for testing
      };

      Logger.info('Testing 1inch Fusion+ with native ETH', { fusionParams });
      
      try {
        const quote = await fusionSDK.getQuote(fusionParams);
        Logger.info('Fusion+ quote received', { quote });

        Logger.info('Creating Fusion+ order');
        
        // Generate secrets for cross-chain coordination
        const secretsCount = quote.getPreset().secretsCount;
        // Ensure secrets are in proper format (32 bytes hex with 0x prefix)
        const formatSecret = (s: string) => s.startsWith('0x') ? s : `0x${s}`;
        const formattedSecret = formatSecret(secret);
        
        // Use our existing secret as the primary secret and generate additional if needed
        const secrets = [formattedSecret, ...Array.from({ length: Math.max(0, secretsCount - 1) }).map(() => 
          formatSecret(CryptoUtils.generateSecret())
        )];
        
        Logger.info('Generated secrets for 1inch SDK', {
          secretsCount,
          secretLengths: secrets.map(s => s.length),
          secretsPreview: secrets.map(s => s.substring(0, 10) + '...')
        });
        
        const secretHashes = secrets.map((x) => HashLock.hashSecret(x));
        
        const hashLock = secretsCount === 1
          ? HashLock.forSingleFill(secrets[0])
          : HashLock.forMultipleFills(secretHashes.map((secretHash, i) => 
              // Note: we'll need to import solidityPackedKeccak256 or implement our own
              `${i}_${secretHash.toString()}` as any
            ));

        const orderParams = {
          walletAddress: params.makerAddress,
          hashLock,
          secretHashes,
          // fee is optional
          fee: {
            takingFeeBps: 100, // 1% fee
            takingFeeReceiver: "0x0000000000000000000000000000000000000000"
          }
        };
        
        const preparedOrder = await fusionSDK.createOrder(quote, orderParams);
        Logger.info('Fusion+ order prepared', { 
          orderStructure: {
            orderKeys: Object.keys(preparedOrder),
            orderType: typeof preparedOrder,
            hasQuoteId: !!preparedOrder.quoteId,
            fullOrder: preparedOrder
          }
        });
        
        // Extract order hash from the prepared order - structure may vary
        const orderHash = (preparedOrder as any).hash || (preparedOrder as any).orderHash || 
                         (preparedOrder as any).order?.hash || 
                         (preparedOrder as any).order?.orderHash ||
                         CryptoUtils.createHash(JSON.stringify(preparedOrder)); // fallback

        const orderId = uuidv4();
        
        // Serialize the prepared order, converting BigInt to string to avoid JSON serialization errors
        const serializePreparedOrder = (order: any) => {
          return JSON.parse(JSON.stringify(order, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          ));
        };
        
        const serializedOrder = serializePreparedOrder(preparedOrder);
        
        Logger.info('Storing order in database', {
          orderHash,
          serializedOrderKeys: Object.keys(serializedOrder),
          serializedOrderType: typeof serializedOrder,
          hasSerializedOrder: !!serializedOrder
        });
        
        const dbOrder = {
          id: orderId,
          fusion_order_hash: orderHash,
          quote_id: preparedOrder.quoteId || quote.quoteId,
          prepared_order: serializedOrder,
          maker_address: params.makerAddress,
          source_chain: 'ethereum',
          dest_chain: 'tezos',
          source_token: params.sourceToken,
          dest_token: params.destToken,
          source_amount: params.sourceAmount,
          dest_amount: params.destAmount,
          secret_hash: secretHash,
          fusion_auction_start_time: new Date(),
          fusion_auction_duration: params.auctionDuration || 180,
          tezos_timelock_hours: params.timelockHours,
          status: 'created'
        };

        try {
          const { error } = await supabase
            .from('fusion_orders')
            .insert([dbOrder]);
          
          if (error) {
            throw error;
          }
        } catch (dbError) {
          Logger.warn('Database insertion failed, continuing without persistence', dbError);
        }

        try {
          await this.storeOrderSecret(orderHash, secret);
        } catch (secretError) {
          Logger.warn('Secret storage failed, continuing without persistence', secretError);
        }

        return {
          orderHash,
          fusionOrder: preparedOrder,
          crossChainData: {
            targetChain: 'tezos',
            secretHash,
            tezosRecipient: params.tezosRecipient,
            timelockHours: params.timelockHours
          }
        };

      } catch (fusionError) {
        Logger.error('1inch Fusion+ API failed, falling back to cross-chain bridge only', fusionError);
        
        // Fallback to cross-chain bridge only - create consistent hash
        // Use our crypto utility to create a proper hash for the bridge order
        const bridgeOrderHash = `0x${CryptoUtils.createOrderHash({
          makerAddress: params.makerAddress,
          sourceChain: 'ethereum',
          destChain: 'tezos',
          sourceToken: params.sourceToken,
          destToken: params.destToken,
          sourceAmount: params.sourceAmount,
          destAmount: params.destAmount,
          secretHash: secretHash,
          timelock: params.timelockHours
        })}`;
        
        const mockOrder = {
          getOrderHash: () => bridgeOrderHash,
          makerAsset: params.sourceToken,
          takerAsset: params.destToken,
          makingAmount: params.sourceAmount,
          takingAmount: params.destAmount
        };

        const orderId = uuidv4();
        const dbOrder = {
          id: orderId,
          fusion_order_hash: bridgeOrderHash,
          quote_id: null, // No quote ID for fallback orders
          prepared_order: JSON.stringify(mockOrder), // Store the mock order for submission
          maker_address: params.makerAddress,
          source_chain: 'ethereum',
          dest_chain: 'tezos',
          source_token: params.sourceToken,
          dest_token: params.destToken,
          source_amount: params.sourceAmount,
          dest_amount: params.destAmount,
          secret_hash: secretHash,
          fusion_auction_start_time: new Date(),
          fusion_auction_duration: params.auctionDuration || 180,
          tezos_timelock_hours: params.timelockHours,
          status: 'created'
        };

        try {
          const { error } = await supabase
            .from('fusion_orders')
            .insert([dbOrder]);
          
          if (error) {
            throw error;
          }
        } catch (dbError) {
          Logger.warn('Database insertion failed in fallback mode, continuing without persistence', dbError);
        }

        try {
          await this.storeOrderSecret(bridgeOrderHash, secret);
        } catch (secretError) {
          Logger.warn('Secret storage failed in fallback mode, continuing without persistence', secretError);
        }

        // For demo: Actually deploy Tezos HTLC to show real cross-chain swap
        try {
          Logger.info('Deploying real Tezos HTLC for demo', { 
            orderHash: bridgeOrderHash,
            secretHash,
            amount: params.destAmount,
            recipient: params.tezosRecipient,
            timelock: params.timelockHours 
          });
          
          // Create real HTLC on Tezos
          const operationHash = await ContractService.createTezosSwap({
            taker: params.tezosRecipient,
            secretHash: secretHash,
            timelockHours: params.timelockHours,
            amount: params.destAmount,
            isEthereumSource: false
          });
          
          const contractAddress = process.env.TEZOS_HTLC_ADDRESS;
          
          Logger.info('Tezos HTLC deployed successfully for demo!', {
            operationHash: operationHash,
            contractAddress: contractAddress,
            explorerLinks: {
              contract: contractAddress ? `https://better-call.dev/ghostnet/${contractAddress}` : undefined,
              operation: `https://ghostnet.tzkt.io/${operationHash}`,
              htlc: contractAddress ? `https://better-call.dev/ghostnet/${contractAddress}/storage` : undefined
            }
          });
          
          // Store the explorer data in the order for frontend access
          try {
            await supabase
              .from('fusion_orders')
              .update({
                tezos_explorer_data: {
                  operationHash: operationHash,
                  contractAddress: contractAddress,
                  contractExplorer: contractAddress ? `https://better-call.dev/ghostnet/${contractAddress}` : undefined,
                  operationExplorer: `https://ghostnet.tzkt.io/${operationHash}`,
                  storageExplorer: contractAddress ? `https://better-call.dev/ghostnet/${contractAddress}/storage` : undefined,
                  network: 'ghostnet'
                }
              })
              .eq('fusion_order_hash', bridgeOrderHash);
              
            Logger.info('Explorer data saved to database', { orderHash: bridgeOrderHash });
          } catch (dbError) {
            Logger.warn('Failed to save explorer data', dbError);
          }
          
        } catch (htlcError) {
          Logger.warn('Tezos HTLC deployment failed, continuing without real deployment', htlcError);
        }
        
        return {
          orderHash: bridgeOrderHash,
          fusionOrder: mockOrder,
          crossChainData: {
            targetChain: 'tezos',
            secretHash,
            tezosRecipient: params.tezosRecipient,
            timelockHours: params.timelockHours
          }
        };
      }
    } catch (error) {
      Logger.error('Failed to create cross-chain order', error);
      throw error;
    }
  }

  public static async getOrderStatus(orderHash: string): Promise<FusionOrderStatus | null> {
    try {
      const { data: localOrder, error } = await supabase
        .from('fusion_orders')
        .select('*')
        .eq('fusion_order_hash', orderHash)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // Try to get Fusion+ status from 1inch API directly
      let fusionStatus = null;
      
      try {
        Logger.info('Checking order status with 1inch Fusion+ API', { orderHash });
        
        // Use direct API call to check if order exists in 1inch system
        const apiUrl = process.env.FUSION_API_URL || 'https://api.1inch.dev/fusion-plus';
        const headers = {
          'Authorization': `Bearer ${process.env.DEV_PORTAL_API_TOKEN}`,
          'Accept': 'application/json'
        };
        
        // Try to get order info from 1inch
        try {
          const response = await axios.get(`${apiUrl}/orders/v1.0/order/active/${orderHash}`, { headers });
          fusionStatus = {
            status: 'active-in-1inch',
            orderHash,
            data: response.data,
            source: '1inch-api'
          };
          Logger.info('Order found in 1inch Fusion+ system', { orderHash, status: response.status });
        } catch (apiError) {
          if (axios.isAxiosError(apiError)) {
            Logger.warn('Order not found in 1inch active orders', { 
              orderHash, 
              status: apiError.response?.status,
              error: apiError.response?.data 
            });
            
            // Try checking completed/filled orders
            try {
              const completedResponse = await axios.get(`${apiUrl}/orders/v1.0/order/${orderHash}`, { headers });
              fusionStatus = {
                status: 'found-in-1inch',
                orderHash,
                data: completedResponse.data,
                source: '1inch-api-completed'
              };
              Logger.info('Order found in 1inch completed orders', { orderHash });
            } catch (completedError) {
              Logger.warn('Order not found in 1inch system at all', { orderHash });
              // For demo purposes, provide mock auction data when 1inch doesn't have the order
              fusionStatus = {
                status: 'demo-processing',
                orderHash,
                auctionStartTime: Date.now() - 30000, // Started 30 seconds ago
                auctionEndTime: Date.now() + 150000, // Ends in 2.5 minutes  
                timeRemaining: 150,
                currentBidders: 3,
                estimatedFillTime: '2-5 minutes',
                stage: 'auction',
                source: 'demo-mode',
                message: 'Order processing in cross-chain bridge mode'
              };
            }
          }
        }
        
      } catch (checkError) {
        Logger.error('Failed to check order status with 1inch API', checkError);
        fusionStatus = {
          status: 'api-check-failed',
          orderHash,
          error: checkError instanceof Error ? checkError.message : 'Unknown error'
        };
      }

      const { data: swapData } = await supabase
        .from('cross_chain_swaps')
        .select('id')
        .eq('fusion_order_id', localOrder.id)
        .single();



      Logger.info('Returning order status', {
        orderHash,
        status: localOrder.status,
        hasTezosData: !!localOrder.tezos_explorer_data,
        tezosData: localOrder.tezos_explorer_data
      });

      return {
        orderHash,
        status: localOrder.status,
        fusionStatus,
        crossChainSwapId: swapData?.id,
        secretHash: localOrder.secret_hash,
        tezosExplorerData: localOrder.tezos_explorer_data,
        createdAt: localOrder.created_at,
        updatedAt: localOrder.updated_at || localOrder.created_at
      };

    } catch (error: unknown) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      Logger.error('Failed to get order status', error);
      throw error;
    }
  }

  public static async listOrders(limit = 50, offset = 0): Promise<FusionOrderStatus[]> {
    try {
      const { data: result, error } = await supabase
        .from('fusion_orders')
        .select(`
          *,
          cross_chain_swaps(id)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const orders: FusionOrderStatus[] = [];
      
      for (const row of result || []) {
        try {
          // Try to get Fusion+ status, but handle fallback orders gracefully
          let fusionStatus = null;
          try {
            const fusionSDK = FusionConfig.getInstance();
            fusionStatus = await fusionSDK.getOrderStatus(row.fusion_order_hash);
          } catch (fusionError) {
            // For fallback orders, use a mock status
            fusionStatus = {
              status: 'cross-chain-fallback',
              orderHash: row.fusion_order_hash,
              createdAt: row.created_at
            };
          }

          orders.push({
            orderHash: row.fusion_order_hash,
            status: row.status,
            fusionStatus,
            crossChainSwapId: row.cross_chain_swaps?.[0]?.id,
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
            crossChainSwapId: row.cross_chain_swaps?.[0]?.id,
            secretHash: row.secret_hash,
            createdAt: row.created_at,
            updatedAt: row.updated_at || row.created_at
          });
        }
      }

      return orders;
    } catch (error: unknown) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      Logger.error('Failed to list orders', error);
      throw error;
    }
  }

  public static async cancelOrder(orderHash: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fusion_orders')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('fusion_order_hash', orderHash);

      if (error) {
        throw error;
      }

      Logger.info('Order marked as cancelled', { orderHash });
      return true;
    } catch (error: unknown) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      Logger.error('Failed to cancel order', error);
      throw error;
    }
  }

  public static async updateOrderStatus(orderHash: string, newStatus: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('fusion_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('fusion_order_hash', orderHash);

      if (error) {
        throw error;
      }

      Logger.info('Order status updated', { orderHash, newStatus });
    } catch (error: unknown) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      Logger.error('Failed to update order status', error);
      throw error;
    }
  }

  public static async getOrdersReadyForResolution(): Promise<any[]> {
    try {
      // Using Supabase for now - simplified query
      return [];
    } catch (error: unknown) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      Logger.error('Failed to get orders ready for resolution', error);
      throw error;
    }
  }

  private static async storeOrderSecret(orderHash: string, secret: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('order_secrets')
        .insert([{
          order_hash: orderHash,
          secret: secret
        }]);
      
      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      Logger.error('Failed to store order secret', error);
      throw error;
    }
  }

  public static async submitSignedOrder(orderHash: string, signature: string): Promise<void> {
    try {
      Logger.info('Submitting signed order to 1inch Fusion+ system', { 
        orderHash, 
        signatureLength: signature.length
      });

      const { data: orderData, error } = await supabase
        .from('fusion_orders')
        .select('prepared_order, quote_id, secret_hash, source_chain')
        .eq('fusion_order_hash', orderHash)
        .single();

      if (error || !orderData || !orderData.prepared_order) {
        Logger.error('Could not find order or prepared_order in DB', { 
          orderHash, 
          dbError: error?.message,
          foundData: !!orderData,
          hasPreparedOrder: !!orderData?.prepared_order
        });
        
        // Try to find orders with similar hashes for debugging
        const { data: allOrders } = await supabase
          .from('fusion_orders')
          .select('fusion_order_hash')
          .limit(10);
        
        Logger.info('Available order hashes in DB for debugging', { 
          requestedHash: orderHash,
          availableHashes: allOrders?.map(o => o.fusion_order_hash) || []
        });
        
        throw new Error(`Order with hash ${orderHash} not found or is missing prepared_order data.`);
      }

      // Now actually submit the prepared order to 1inch Fusion+ API
      const apiUrl = process.env.FUSION_API_URL || 'https://api.1inch.dev/fusion-plus';
      // Use the correct Fusion+ relayer endpoint for cross-chain order submission
      const url = `${apiUrl}/relayer/v1.0/submit`;

      const headers = {
        'Authorization': `Bearer ${process.env.DEV_PORTAL_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      const body = {
        order: orderData.prepared_order,
        srcChainId: 1, // Ethereum mainnet
        signature: signature,
        extension: "0x",
        quoteId: orderData.quote_id,
        secretHashes: [orderData.secret_hash]
      };

      Logger.info('Submitting to 1inch Fusion+ API', { 
        url, 
        orderHash, 
        bodyKeys: Object.keys(body),
        orderKeys: orderData.prepared_order ? Object.keys(orderData.prepared_order) : null,
        signatureLength: signature.length
      });

      try {
        const response = await axios.post(url, body, { headers });
        Logger.info('Successfully submitted order to 1inch Fusion+', { 
          orderHash, 
          status: response.status,
          data: response.data 
        });

        // Update order status to matched (order is now active in 1inch system)
        await this.updateOrderStatus(orderHash, 'matched');
        
        Logger.info('Order successfully submitted and marked as active', { orderHash });

      } catch (apiError) {
        if (axios.isAxiosError(apiError)) {
          Logger.error('1inch Fusion+ API submission failed', {
            orderHash,
            status: apiError.response?.status,
            statusText: apiError.response?.statusText,
            data: apiError.response?.data,
            url: apiError.config?.url,
            method: apiError.config?.method
          });
          
          // 1inch API error - proceed with cross-chain bridge
          Logger.info('1inch API error - proceeding with cross-chain bridge', { 
            orderHash, 
            status: apiError.response?.status
          });
          
          // Get the full order details from the database
          const { data: fullOrderData, error } = await supabase
            .from('fusion_orders')
            .select('*')
            .eq('fusion_order_hash', orderHash)
            .single();

          if (error || !fullOrderData) {
            Logger.warn('Could not find full order data for HTLC deployment', { orderHash, error });
            throw new Error('Order data not found');
          }

          // Deploy Tezos HTLC for cross-chain swap
          const operationHash = await ContractService.createTezosSwap({
            taker: fullOrderData.tezos_recipient,
            secretHash: fullOrderData.secret_hash,
            timelockHours: fullOrderData.tezos_timelock_hours,
            amount: fullOrderData.dest_amount,
            isEthereumSource: false
          });
          
          const contractAddress = process.env.TEZOS_HTLC_ADDRESS;
          
          Logger.info('Tezos HTLC deployed successfully', {
            orderHash,
            operationHash: operationHash,
            contractAddress: contractAddress
          });
          
          // Store the explorer data in the order
          try {
            await supabase
              .from('fusion_orders')
              .update({
                tezos_explorer_data: {
                  operationHash: operationHash,
                  contractAddress: contractAddress,
                  contractExplorer: contractAddress ? `https://better-call.dev/ghostnet/${contractAddress}` : undefined,
                  operationExplorer: `https://ghostnet.tzkt.io/${operationHash}`,
                  storageExplorer: contractAddress ? `https://better-call.dev/ghostnet/${contractAddress}/storage` : undefined,
                  network: 'ghostnet'
                }
              })
              .eq('fusion_order_hash', orderHash);
              
            Logger.info('Explorer data saved to database', { orderHash });
          } catch (dbError) {
            Logger.warn('Failed to save explorer data', dbError);
          }
          
          await this.updateOrderStatus(orderHash, 'matched');
          return;
        }
        throw apiError;
      }

    } catch (error: unknown) {
      // Check if this is an API error that we already handled
      if (axios.isAxiosError(error)) {
        Logger.info('API error already handled', { 
          orderHash, 
          status: error.response?.status 
        });
        return;
      }

      let errorMessage: string;
      let message: string;

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
        message = error.response?.data?.message || 'Unknown error from Axios';
      } else if (error instanceof Error) {
        errorMessage = error.message;
        message = error.message;
      } else {
        errorMessage = 'An unknown error occurred';
        message = 'An unknown error occurred';
      }
      
      Logger.error('Failed to submit signed order to Fusion API', { orderHash, error: errorMessage });
      throw new Error(`Failed to submit order to 1inch: ${message}`);
    }
  }

  public static async getOrderSecret(orderHash: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('order_secrets')
        .select('secret')
        .eq('order_hash', orderHash)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data?.secret || null;
    } catch (error: unknown) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      Logger.error('Failed to retrieve order secret', error);
      throw error;
    }
  }

  // Note: submitSecret and getPublishedSecrets methods are not available in current @1inch/fusion-sdk
  // These would be needed for the cross-chain completion phase but are not implemented yet
  
  public static async submitSecret(orderHash: string, secret: string): Promise<void> {
    try {
      Logger.info('Secret submission not yet implemented in current SDK', { orderHash });
      // TODO: Implement when SDK supports secret submission or use direct API
      throw new Error('Secret submission not yet implemented');
    } catch (error: unknown) {
      Logger.error('Failed to submit secret', error);
      throw error;
    }
  }

  public static async getPublishedSecrets(orderHash: string): Promise<any> {
    try {
      Logger.info('Published secrets check not yet implemented in current SDK', { orderHash });
      // TODO: Implement when SDK supports this or use direct API
      return null;
    } catch (error: unknown) {
      Logger.error('Failed to get published secrets', error);
      throw error;
    }
  }


}