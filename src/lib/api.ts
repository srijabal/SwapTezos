// SwapTezos API Client

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types for API requests and responses
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

export interface QuoteRequest {
  fromToken: string;
  toToken: string;
  amount: string;
  fromChain: string;
  toChain: string;
}

export interface OrderStatus {
  orderHash: string;
  status: 'created' | 'matched' | 'filled' | 'cancelled' | 'expired';
  fusionStatus: any;
  crossChainSwapId?: string;
  secretHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteResponse {
  fromAmount: string;
  toAmount: string;
  exchangeRate: string;
  estimatedGas: string;
  priceImpact: string;
  route: any[];
}

export interface CreateOrderResponse {
  success: boolean;
  data: {
    orderHash: string;
    secretHash: string;
    targetChain: string;
    tezosRecipient: string;
    timelockHours: number;
    fusionOrder: any;
  };
}

export interface CrossChainSwapRequest {
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

export interface CrossChainSwapResponse {
  success: boolean;
  data: {
    swapId: string;
    secretHash: string;
    ethereumSwapId?: number;
    tezosSwapId?: number;
    fusionOrderHash?: string;
    status: string;
    expirationTime: string;
  };
}

// API Client Class
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or parsing errors
      throw new ApiError(
        0,
        error instanceof Error ? error.message : 'Unknown error occurred',
        { originalError: error }
      );
    }
  }

  // Fusion+ Order Management
  async createOrder(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.request<CreateOrderResponse>('/api/fusion/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrderStatus(orderHash: string): Promise<OrderStatus> {
    return this.request<OrderStatus>(`/api/fusion/orders/${orderHash}`);
  }

  async listOrders(limit = 50, offset = 0): Promise<{ success: boolean; data: OrderStatus[] }> {
    return this.request<{ success: boolean; data: OrderStatus[] }>(
      `/api/fusion/orders?limit=${limit}&offset=${offset}`
    );
  }

  async cancelOrder(orderHash: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/fusion/orders/${orderHash}/cancel`, {
      method: 'POST',
    });
  }

  async submitSignedOrder(orderHash: string, signature: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/fusion/orders/${orderHash}/submit`, {
      method: 'POST',
      body: JSON.stringify({ signature }),
    });
  }

  // Quote Management
  async getQuote(quoteData: QuoteRequest): Promise<QuoteResponse> {
    return this.request<QuoteResponse>('/api/fusion/quote', {
      method: 'POST',
      body: JSON.stringify(quoteData),
    });
  }

  // Status and Health
  async getSystemHealth(): Promise<any> {
    return this.request<any>('/api/status/health');
  }

  async getOrderStatusByHash(orderHash: string): Promise<any> {
    return this.request<any>(`/api/status/fusion/${orderHash}`);
  }

  async getOrdersList(limit = 50, offset = 0): Promise<any> {
    return this.request<any>(`/api/status/orders?limit=${limit}&offset=${offset}`);
  }

  // Cross-chain swap operations
  async createCrossChainSwap(swapData: CrossChainSwapRequest): Promise<CrossChainSwapResponse> {
    return this.request<CrossChainSwapResponse>('/api/cross-chain/swaps', {
      method: 'POST',
      body: JSON.stringify(swapData),
    });
  }

  async getCrossChainSwapStatus(swapId: string): Promise<any> {
    return this.request<any>(`/api/cross-chain/swaps/${swapId}`);
  }

  async claimCrossChainSwap(swapId: string, secret: string): Promise<any> {
    return this.request<any>(`/api/cross-chain/swaps/${swapId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ secret }),
    });
  }

  async listCrossChainSwaps(limit = 50, offset = 0): Promise<any> {
    return this.request<any>(`/api/cross-chain/swaps?limit=${limit}&offset=${offset}`);
  }

  // Resolver Operations (for advanced users)
  async getResolverOpportunities(): Promise<any> {
    return this.request<any>('/api/fusion/resolver/opportunities');
  }

  async getResolverStats(): Promise<any> {
    return this.request<any>('/api/fusion/resolver/stats');
  }
}

// Custom Error Class
export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(status: number, message: string, data: any = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

// Create and export the default API client instance
export const api = new ApiClient(API_BASE_URL);

// Export utility functions
export const formatAmount = (amount: string, decimals = 18): string => {
  const num = parseFloat(amount);
  if (num === 0) return '0';
  if (num < 0.0001) return '< 0.0001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
  return (num / 1000000).toFixed(2) + 'M';
};

export const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export const shortenHash = (hash: string, startChars = 6, endChars = 4): string => {
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
};
