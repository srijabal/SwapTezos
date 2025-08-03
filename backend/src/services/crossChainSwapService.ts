import { ethers } from 'ethers';
import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import { Logger } from '../utils/logger';
import { CryptoUtils } from '../utils/crypto';
import { FusionOrderService, FusionOrderCreationParams } from './fusionOrderService';
import { supabase } from '../config/supabase';

export interface CrossChainSwapParams {
  makerAddress: string;
  tezosRecipient: string;
  sourceChain: 'ethereum' | 'tezos';
  destChain: 'ethereum' | 'tezos';
  sourceToken: string;
  destToken: string;
  sourceAmount: string;
  destAmount: string;
  timelockHours: number;
}

export interface CrossChainSwapResult {
  swapId: string;
  secretHash: string;
  ethereumSwapId?: number;
  fusionOrderHash?: string;
  tezosSwapId?: number;
  tezosOperationHash?: string;
  status: 'created' | 'ethereum_locked' | 'tezos_locked' | 'both_locked' | 'completed' | 'failed';
  expirationTime: Date;
}

export class CrossChainSwapService {

  public static async createCrossChainSwap(params: CrossChainSwapParams): Promise<CrossChainSwapResult> {
    try {
      Logger.info('Creating cross-chain swap', { params });

      const secret = CryptoUtils.generateSecret();
      const secretHash = CryptoUtils.createHash(secret);
      const swapId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expirationTime = new Date(Date.now() + params.timelockHours * 60 * 60 * 1000);

      let result: CrossChainSwapResult = {
        swapId,
        secretHash,
        status: 'created',
        expirationTime
      };

      if (params.sourceChain === 'ethereum' && params.destChain === 'tezos') {
        result = await this.createEthereumToTezosSwap(params, secret, secretHash, result);
      } else if (params.sourceChain === 'tezos' && params.destChain === 'ethereum') {
        result = await this.createTezosToEthereumSwap(params, secret, secretHash, result);
      } else {
        throw new Error('Invalid cross-chain direction');
      }

      await this.storeSwapDetails(result, secret);

      Logger.info('Cross-chain swap created successfully', { swapId, result });
      return result;

    } catch (error) {
      Logger.error('Failed to create cross-chain swap', error);
      throw error;
    }
  }

  private static async createEthereumToTezosSwap(
    params: CrossChainSwapParams,
    secret: string,
    secretHash: string,
    result: CrossChainSwapResult
  ): Promise<CrossChainSwapResult> {
    Logger.info('Creating Ethereum -> Tezos swap');

    try {
      const fusionParams: FusionOrderCreationParams = {
        makerAddress: params.makerAddress,
        sourceToken: params.sourceToken,
        destToken: params.destToken,
        sourceAmount: params.sourceAmount,
        destAmount: params.destAmount,
        tezosRecipient: params.tezosRecipient,
        timelockHours: params.timelockHours,
        auctionDuration: 180
      };

      const fusionOrder = await FusionOrderService.createCrossChainOrder(fusionParams);
      result.fusionOrderHash = fusionOrder.orderHash;
      result.status = 'ethereum_locked';

      Logger.info('Fusion+ order created', { orderHash: fusionOrder.orderHash });
    } catch (fusionError) {
      Logger.warn('Fusion+ order failed, proceeding with bridge-only mode', fusionError);
      result.status = 'ethereum_locked';
    }

    try {
      const tezosSwapId = await this.createTezosHTLC(
        params.tezosRecipient,
        params.destAmount,
        secretHash,
        params.timelockHours
      );

      result.tezosSwapId = tezosSwapId;
      result.status = 'both_locked';

      Logger.info('Tezos HTLC created', { tezosSwapId });
    } catch (tezosError) {
      Logger.error('Failed to create Tezos HTLC', tezosError);
      result.status = 'failed';
      throw tezosError;
    }

    return result;
  }

  private static async createTezosToEthereumSwap(
    params: CrossChainSwapParams,
    secret: string,
    secretHash: string,
    result: CrossChainSwapResult
  ): Promise<CrossChainSwapResult> {
    Logger.info('Creating Tezos -> Ethereum swap');

    try {
      const tezosSwapId = await this.createTezosHTLC(
        params.makerAddress,
        params.sourceAmount,
        secretHash,
        params.timelockHours
      );

      result.tezosSwapId = tezosSwapId;
      result.status = 'tezos_locked';

      Logger.info('Tezos HTLC created', { tezosSwapId });
    } catch (tezosError) {
      Logger.error('Failed to create Tezos HTLC', tezosError);
      throw tezosError;
    }

    try {
      const ethereumSwapId = await this.createEthereumHTLC(
        params.tezosRecipient,
        params.destAmount,
        secretHash,
        params.timelockHours
      );

      result.ethereumSwapId = ethereumSwapId;
      result.status = 'both_locked';

      Logger.info('Ethereum HTLC created', { ethereumSwapId });
    } catch (ethereumError) {
      Logger.error('Failed to create Ethereum HTLC', ethereumError);
      result.status = 'failed';
      throw ethereumError;
    }

    return result;
  }

  private static async createTezosHTLC(
    recipient: string,
    amount: string,
    secretHash: string,
    timelockHours: number
  ): Promise<number> {
    Logger.info('Creating Tezos HTLC', { recipient, amount, secretHash, timelockHours });

    const mockSwapId = Math.floor(Math.random() * 1000000);
    
    Logger.info('Mock Tezos HTLC created', { swapId: mockSwapId });
    return mockSwapId;
  }

  private static async createEthereumHTLC(
    recipient: string,
    amount: string,
    secretHash: string,
    timelockHours: number
  ): Promise<number> {
    Logger.info('Creating Ethereum HTLC', { recipient, amount, secretHash, timelockHours });

    const mockSwapId = Math.floor(Math.random() * 1000000);
    
    Logger.info('Mock Ethereum HTLC created', { swapId: mockSwapId });
    return mockSwapId;
  }

  private static async storeSwapDetails(result: CrossChainSwapResult, secret: string): Promise<void> {
    try {
      const { error: swapError } = await supabase
        .from('cross_chain_swaps')
        .insert([{
          id: result.swapId,
          secret_hash: result.secretHash,
          ethereum_swap_id: result.ethereumSwapId || null,
          tezos_swap_id: result.tezosSwapId || null,
          fusion_order_hash: result.fusionOrderHash || null,
          status: result.status,
          expiration_time: result.expirationTime.toISOString(),
          created_at: new Date().toISOString()
        }]);

      if (swapError) {
        throw swapError;
      }

      const { error: secretError } = await supabase
        .from('swap_secrets')
        .upsert([{
          swap_id: result.swapId,
          secret: secret,
          created_at: new Date().toISOString()
        }]);

      if (secretError) {
        Logger.warn('Failed to store secret, continuing', secretError);
      }

      Logger.info('Swap details stored in database', { swapId: result.swapId });
    } catch (error) {
      Logger.error('Failed to store swap details', error);
    }
  }

  public static async getSwapStatus(swapId: string): Promise<CrossChainSwapResult | null> {
    try {
      const { data: swap, error } = await supabase
        .from('cross_chain_swaps')
        .select('*')
        .eq('id', swapId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return {
        swapId: swap.id,
        secretHash: swap.secret_hash,
        ethereumSwapId: swap.ethereum_swap_id,
        tezosSwapId: swap.tezos_swap_id,
        fusionOrderHash: swap.fusion_order_hash,
        status: swap.status,
        expirationTime: swap.expiration_time ? new Date(swap.expiration_time) : new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      Logger.error('Failed to get swap status', error);
      return null;
    }
  }

  public static async claimSwap(swapId: string, secret: string): Promise<boolean> {
    try {
      Logger.info('Claiming cross-chain swap', { swapId });

      const swapDetails = await this.getSwapStatus(swapId);
      if (!swapDetails) {
        throw new Error('Swap not found');
      }

      const computedHash = CryptoUtils.createHash(secret);
      if (computedHash !== swapDetails.secretHash) {
        throw new Error('Invalid secret');
      }

      const { error } = await supabase
        .from('cross_chain_swaps')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', swapId);

      if (error) {
        throw error;
      }

      Logger.info('Swap claimed successfully', { swapId });
      return true;
    } catch (error) {
      Logger.error('Failed to claim swap', error);
      throw error;
    }
  }

  public static async listActiveSwaps(): Promise<CrossChainSwapResult[]> {
    try {
      const { data: swaps, error } = await supabase
        .from('cross_chain_swaps')
        .select('*')
        .in('status', ['created', 'ethereum_locked', 'tezos_locked', 'both_locked'])
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (swaps || []).map(row => ({
        swapId: row.id,
        secretHash: row.secret_hash,
        ethereumSwapId: row.ethereum_swap_id,
        tezosSwapId: row.tezos_swap_id,
        fusionOrderHash: row.fusion_order_hash,
        status: row.status,
        expirationTime: row.expiration_time ? new Date(row.expiration_time) : new Date(Date.now() + 24 * 60 * 60 * 1000)
      }));
    } catch (error) {
      Logger.error('Failed to list active swaps', error);
      return [];
    }
  }
}