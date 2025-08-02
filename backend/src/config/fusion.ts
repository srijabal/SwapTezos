import { FusionSDK, NetworkEnum, PrivateKeyProviderConnector } from '@1inch/fusion-sdk';
import { Web3 } from 'web3';
import { Logger } from '../utils/logger';

export class FusionConfig {
  private static instance: FusionSDK | null = null;
  private static connector: PrivateKeyProviderConnector | null = null;

  public static async initialize(): Promise<FusionSDK> {
    if (this.instance) {
      return this.instance;
    }

    try {
      const requiredEnvVars = [
        'FUSION_RESOLVER_PRIVATE_KEY',
        'ETHEREUM_RPC_URL',
        'DEV_PORTAL_API_TOKEN'
      ];

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Missing required environment variable: ${envVar}`);
        }
      }

      const web3 = new Web3(process.env.ETHEREUM_RPC_URL!);
      
      this.connector = new PrivateKeyProviderConnector(
        process.env.FUSION_RESOLVER_PRIVATE_KEY!,
        web3
      );

      const network = this.getNetworkFromRPC(process.env.ETHEREUM_RPC_URL!);
      
      this.instance = new FusionSDK({
        url: process.env.FUSION_API_URL || 'https://api.1inch.dev/fusion',
        network,
        blockchainProvider: this.connector,
        authKey: process.env.DEV_PORTAL_API_TOKEN!
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
    if (rpcUrl.includes('mainnet') || rpcUrl.includes('ethereum.org')) {
      return NetworkEnum.ETHEREUM;
    } else if (rpcUrl.includes('sepolia')) {
      return NetworkEnum.ETHEREUM;
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

      return true;
    } catch (error) {
      Logger.error('Fusion SDK health check failed', error);
      return false;
    }
  }
}

export interface CrossChainOrderParams {
  sourceToken: string;
  destToken: string;
  sourceAmount: string;
  destAmount: string;
  tezosRecipient: string;
  timelockHours: number;
  secretHash: string;
}

export interface FusionOrderWithCrossChainData {
  orderHash: string;
  fusionOrder: any;
  crossChainData: {
    targetChain: 'tezos';
    secretHash: string;
    tezosRecipient: string;
    timelockHours: number;
  };
}