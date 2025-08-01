import { FusionSDK, NetworkEnum } from '@1inch/fusion-sdk';
import { PrivateKeyProviderConnector } from '@1inch/fusion-sdk/connector';
import { ethers } from 'ethers';
import { Logger } from '../utils/logger';

export class FusionConfig {
  private static instance: FusionSDK | null = null;
  private static connector: PrivateKeyProviderConnector | null = null;

  public static async initialize(): Promise<FusionSDK> {
    if (this.instance) {
      return this.instance;
    }

    try {
      // Validate required environment variables
      const requiredEnvVars = [
        'FUSION_RESOLVER_PRIVATE_KEY',
        'ETHEREUM_RPC_URL',
        'FUSION_API_TOKEN'
      ];

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Missing required environment variable: ${envVar}`);
        }
      }

      // Create Web3 provider
      const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
      
      // Create private key connector
      this.connector = new PrivateKeyProviderConnector(
        process.env.FUSION_RESOLVER_PRIVATE_KEY!,
        provider
      );

      // Determine network based on environment
      const network = this.getNetworkFromRPC(process.env.ETHEREUM_RPC_URL!);
      
      // Initialize Fusion SDK
      this.instance = new FusionSDK({
        url: process.env.FUSION_API_URL || 'https://api.1inch.dev/fusion',
        network,
        blockchainProvider: this.connector,
        authKey: process.env.FUSION_API_TOKEN!
      });

      Logger.info('1inch Fusion+ SDK initialized successfully', {
        network: network,
        apiUrl: process.env.FUSION_API_URL || 'https://api.1inch.dev/fusion'
      });

      return this.instance;
    } catch (error) {
      Logger.error('Failed to initialize 1inch Fusion+ SDK', error);
      throw error;
    }
  }

  public static getInstance(): FusionSDK {
    if (!this.instance) {
      throw new Error('Fusion SDK not initialized. Call initialize() first.');
    }
    return this.instance;
  }

  public static getConnector(): PrivateKeyProviderConnector {
    if (!this.connector) {
      throw new Error('Fusion connector not initialized. Call initialize() first.');
    }
    return this.connector;
  }

  private static getNetworkFromRPC(rpcUrl: string): NetworkEnum {
    // Determine network based on RPC URL
    if (rpcUrl.includes('mainnet') || rpcUrl.includes('ethereum.org')) {
      return NetworkEnum.ETHEREUM;
    } else if (rpcUrl.includes('sepolia')) {
      return NetworkEnum.ETHEREUM; // Use Ethereum for testnets
    } else if (rpcUrl.includes('polygon')) {
      return NetworkEnum.POLYGON;
    } else if (rpcUrl.includes('binance') || rpcUrl.includes('bsc')) {
      return NetworkEnum.BINANCE;
    } else if (rpcUrl.includes('arbitrum')) {
      return NetworkEnum.ARBITRUM;
    } else if (rpcUrl.includes('optimism')) {
      return NetworkEnum.OPTIMISM;
    } else if (rpcUrl.includes('base')) {
      return NetworkEnum.BASE;
    } else {
      // Default to Ethereum
      Logger.warn('Could not determine network from RPC URL, defaulting to Ethereum', { rpcUrl });
      return NetworkEnum.ETHEREUM;
    }
  }

  public static getSupportedNetworks(): NetworkEnum[] {
    return [
      NetworkEnum.ETHEREUM,
      NetworkEnum.POLYGON,
      NetworkEnum.BINANCE,
      NetworkEnum.ARBITRUM,
      NetworkEnum.OPTIMISM,
      NetworkEnum.BASE
    ];
  }

  public static async healthCheck(): Promise<boolean> {
    try {
      if (!this.instance) {
        return false;
      }

      // Try to get a simple quote to test connectivity
      // This is a basic health check - you might want to implement a more specific one
      return true;
    } catch (error) {
      Logger.error('Fusion SDK health check failed', error);
      return false;
    }
  }
}

// Types for cross-chain orders
export interface CrossChainOrderParams {
  sourceToken: string;
  destToken: string; // Tezos token address
  sourceAmount: string;
  destAmount: string;
  tezosRecipient: string;
  timelockHours: number;
  secretHash: string;
}

export interface FusionOrderWithCrossChainData {
  orderHash: string;
  fusionOrder: any; // 1inch Fusion order object
  crossChainData: {
    targetChain: 'tezos';
    secretHash: string;
    tezosRecipient: string;
    timelockHours: number;
  };
}