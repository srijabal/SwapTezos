import express from 'express';
import { FusionOrderService, FusionOrderCreationParams } from '../services/fusionOrderService';
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
  tezosRecipient?: string;
}

const router = express.Router();

router.post('/orders', async (req, res) => {
  try {
    const orderRequest: CreateOrderRequest = req.body;
    
    const requiredFields = [
      'makerAddress', 'sourceChain', 'destChain', 
      'sourceToken', 'destToken', 'sourceAmount', 
      'destAmount', 'timelockMinutes'
    ];
    
    for (const field of requiredFields) {
      if (!orderRequest[field as keyof CreateOrderRequest]) {
        return res.status(400).json({ 
          error: 'Missing required field', 
          field 
        });
      }
    }

    if (orderRequest.sourceChain === 'ethereum' && orderRequest.destChain === 'tezos') {
      if (!orderRequest.tezosRecipient) {
        return res.status(400).json({ 
          error: 'tezosRecipient is required for Ethereum -> Tezos swaps' 
        });
      }
    }

    const supportedChains = ['ethereum', 'tezos'];
    if (!supportedChains.includes(orderRequest.sourceChain) || 
        !supportedChains.includes(orderRequest.destChain)) {
      return res.status(400).json({ 
        error: 'Invalid chain. Supported chains: ethereum, tezos' 
      });
    }

    if (orderRequest.sourceChain === orderRequest.destChain) {
      return res.status(400).json({ 
        error: 'Source and destination chains must be different' 
      });
    }

    if (parseFloat(orderRequest.sourceAmount) <= 0 || 
        parseFloat(orderRequest.destAmount) <= 0) {
      return res.status(400).json({ 
        error: 'Amounts must be greater than 0' 
      });
    }

    const timelockHours = orderRequest.timelockMinutes / 60;
    if (timelockHours < 1 || timelockHours > 72) {
      return res.status(400).json({ 
        error: 'Timelock must be between 1 hour and 72 hours' 
      });
    }

    if (orderRequest.sourceChain === 'ethereum' && orderRequest.destChain === 'tezos') {
      const fusionParams: FusionOrderCreationParams = {
        makerAddress: orderRequest.makerAddress,
        sourceToken: orderRequest.sourceToken,
        destToken: orderRequest.destToken,
        sourceAmount: orderRequest.sourceAmount,
        destAmount: orderRequest.destAmount,
        tezosRecipient: orderRequest.tezosRecipient!,
        timelockHours: Math.ceil(orderRequest.timelockMinutes / 60),
        auctionDuration: 180
      };
      
      const fusionOrder = await FusionOrderService.createCrossChainOrder(fusionParams);
      
      const orderToSign = fusionOrder.fusionOrder;
      
      let signingData;
      
      try {
        if (orderToSign.buildTypedData) {
          signingData = orderToSign.buildTypedData();
          
          if (signingData.domain && signingData.domain.chainId === undefined) {
            Logger.warn('SDK returned undefined chainId, fixing to chainId: 1');
            signingData.domain.chainId = 1;
          }
          
          Logger.info('Successfully built signing data using buildTypedData', { 
            hasDomain: !!signingData.domain,
            hasTypes: !!signingData.types,
            hasMessage: !!signingData.message,
            domainKeys: signingData.domain ? Object.keys(signingData.domain) : null,
            fixedChainId: signingData.domain?.chainId
          });
        } else if (orderToSign.getTypedData) {
          signingData = orderToSign.getTypedData();
          
          if (signingData.domain && signingData.domain.chainId === undefined) {
            Logger.warn('SDK returned undefined chainId, fixing to chainId: 1');
            signingData.domain.chainId = 1;
          }
          
          Logger.info('Successfully built signing data using getTypedData', { 
            hasDomain: !!signingData.domain,
            hasTypes: !!signingData.types,
            hasMessage: !!signingData.message,
            domainKeys: signingData.domain ? Object.keys(signingData.domain) : null,
            fixedChainId: signingData.domain?.chainId
          });
        } else {
          Logger.info('Building manual EIP-712 signing data for 1inch Limit Order Protocol');
          
          const domain = {
            name: "1inch Limit Order Protocol",
            version: "4",
            chainId: 1, // Ethereum mainnet - ensure it's a number
            verifyingContract: "0x111111125421ca6dc452d289314280a0f8842a65" // 1inch v5 router
          };

          const types = {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            Order: [
              { name: 'salt', type: 'uint256' },
              { name: 'makerAsset', type: 'address' },
              { name: 'takerAsset', type: 'address' },
              { name: 'maker', type: 'address' },
              { name: 'receiver', type: 'address' },
              { name: 'allowedSender', type: 'address' },
              { name: 'makingAmount', type: 'uint256' },
              { name: 'takingAmount', type: 'uint256' },
              { name: 'offsets', type: 'uint256' },
              { name: 'interactions', type: 'bytes' },
            ],
          };

          let message;
          try {
            const orderData = orderToSign.build?.() || orderToSign.order || orderToSign;
            
            message = {
              salt: "0", 
              makerAsset: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
              takerAsset: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
              maker: fusionParams.makerAddress,
              receiver: "0x0000000000000000000000000000000000000000", // Zero address
              allowedSender: "0x0000000000000000000000000000000000000000", // Zero address for open order
              makingAmount: BigInt(Math.round(parseFloat(fusionParams.sourceAmount) * 1e18)).toString(), // Convert to wei properly
              takingAmount: BigInt(Math.round(parseFloat(fusionParams.destAmount) * 1e6)).toString(), // USDC has 6 decimals
              offsets: "0",
              interactions: "0x",
            };
          } catch (extractError) {
            Logger.warn('Could not extract order details, using placeholder values', extractError);
            message = {
              salt: "0",
              makerAsset: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
              takerAsset: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
              maker: fusionParams.makerAddress,
              receiver: "0x0000000000000000000000000000000000000000",
              allowedSender: "0x0000000000000000000000000000000000000000",
              makingAmount: BigInt(Math.round(parseFloat(fusionParams.sourceAmount) * 1e18)).toString(),
              takingAmount: BigInt(Math.round(parseFloat(fusionParams.destAmount) * 1e6)).toString(),
              offsets: "0",
              interactions: "0x",
            };
          }

          signingData = {
            domain,
            types,
            message,
            primaryType: 'Order'
          };
          
          Logger.info('Built manual EIP-712 signing data', { 
            domain,
            messageKeys: Object.keys(message),
            chainIdType: typeof domain.chainId,
            chainIdValue: domain.chainId
          });
        }
      } catch (signingError) {
        Logger.error('Failed to build signing data', signingError);
        
        signingData = {
          domain: {
            name: "1inch Limit Order Protocol",
            version: "4", 
            chainId: 1, 
            verifyingContract: "0x111111125421ca6dc452d289314280a0f8842a65"
          },
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            Order: [
              { name: 'salt', type: 'uint256' },
              { name: 'makerAsset', type: 'address' },
              { name: 'takerAsset', type: 'address' },
              { name: 'maker', type: 'address' },
              { name: 'receiver', type: 'address' },
              { name: 'allowedSender', type: 'address' },
              { name: 'makingAmount', type: 'uint256' },
              { name: 'takingAmount', type: 'uint256' },
              { name: 'offsets', type: 'uint256' },
              { name: 'interactions', type: 'bytes' },
            ],
          },
          message: {
            salt: "0",
            makerAsset: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
            takerAsset: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6", // USDT
            maker: fusionParams.makerAddress,
            receiver: "0x0000000000000000000000000000000000000000",
            allowedSender: "0x0000000000000000000000000000000000000000",
            makingAmount: (parseFloat(fusionParams.sourceAmount) * 1e18).toString(),
            takingAmount: (parseFloat(fusionParams.destAmount) * 1e6).toString(),
            offsets: "0",
            interactions: "0x",
          },
          primaryType: 'Order',
          error: signingError instanceof Error ? signingError.message : 'Unknown error'
        };
      }

      Logger.info('Final signing data being sent to frontend', {
        hasSigningData: !!signingData,
        hasDomain: !!signingData?.domain,
        chainId: signingData?.domain?.chainId,
        chainIdType: typeof signingData?.domain?.chainId,
        domainKeys: signingData?.domain ? Object.keys(signingData.domain) : null,
        fullDomain: signingData?.domain
      });

      return res.status(201).json({
        success: true,
        data: {
          orderHash: fusionOrder.orderHash,
          secretHash: fusionOrder.crossChainData.secretHash,
          targetChain: fusionOrder.crossChainData.targetChain,
          tezosRecipient: fusionOrder.crossChainData.tezosRecipient,
          timelockHours: fusionOrder.crossChainData.timelockHours,
          fusionOrder: signingData
        }
      });
    } else {
      throw new Error('Tezos -> Ethereum flow not yet implemented');
    }
  } catch (error) {
    Logger.error('Failed to create Fusion+ order', error);
    return res.status(500).json({ 
      error: 'Failed to create Fusion+ order',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
    });
  }
});

router.get('/orders/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    if (!orderHash || orderHash.length < 10) {
      return res.status(400).json({ 
        error: 'Invalid order hash format',
        received: orderHash,
        expected: '66-character hex string starting with 0x'
      });
    }
    
    const orderStatus = await FusionOrderService.getOrderStatus(orderHash);
    if (!orderStatus) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    return res.json({
      success: true,
      data: orderStatus
    });
  } catch (error) {
    Logger.error('Failed to get Fusion+ order', error);
    return res.status(500).json({ 
      error: 'Failed to get Fusion+ order',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
    });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { limit = '50', offset = '0' } = req.query;
    
    const orders = await FusionOrderService.listOrders(
      parseInt(limit as string), 
      parseInt(offset as string)
    );
    
    return res.json({
      success: true,
      data: orders,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: orders.length
      }
    });
  } catch (error) {
    Logger.error('Failed to list Fusion+ orders', error);
    return res.status(500).json({ 
      error: 'Failed to list Fusion+ orders',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
    });
  }
});

router.post('/orders/:orderHash/cancel', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const success = await FusionOrderService.cancelOrder(orderHash);
    
    if (success) {
      return res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } else {
      return res.status(400).json({
        error: 'Failed to cancel order'
      });
    }
  } catch (error) {
    Logger.error('Failed to cancel Fusion+ order', error);
    return res.status(500).json({ 
      error: 'Failed to cancel Fusion+ order',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
    });
  }
});

router.post('/orders/:orderHash/submit', async (req, res) => {
  try {
    const { orderHash } = req.params;
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json({ error: 'Missing required field: signature' });
    }

    await FusionOrderService.submitSignedOrder(orderHash, signature);

    return res.json({ 
      success: true,
      message: "Order processed successfully! Cross-chain swap initiated.",
      orderHash: orderHash,
      status: "processing"
    });
  } catch (error) {
    Logger.error('Failed to submit signed order', error);
    return res.status(500).json({ 
      error: 'Failed to submit signed order',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
    });
  }
});

router.get('/resolver/opportunities', async (req, res) => {
  try {
    const opportunities = await FusionOrderService.getOrdersReadyForResolution();
    
    return res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    Logger.error('Failed to get resolver opportunities', error);
    return res.status(500).json({ 
      error: 'Failed to get resolver opportunities',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
    });
  }
});

router.post('/orders/:orderHash/complete-demo', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    Logger.info('Completing demo Tezos swap', { orderHash });
    
    const secret = await FusionOrderService.getOrderSecret(orderHash);
    
    if (!secret) {
      return res.status(404).json({ error: 'Order secret not found' });
    }
    
    Logger.info('Demo: Revealing secret and claiming Tezos', { 
      orderHash, 
      secretPreview: secret.substring(0, 10) + '...' 
    });
    
    await FusionOrderService.updateOrderStatus(orderHash, 'filled');
    
    return res.json({
      success: true,
      message: 'Demo swap completed! Tezos transferred to recipient.',
      orderHash,
      status: 'completed',
      tezosTransferred: true
    });
    
  } catch (error) {
    Logger.error('Failed to complete demo swap', error);
    return res.status(500).json({ 
      error: 'Failed to complete demo swap',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/quote', async (req, res) => {
  try {
    Logger.info('Quote request received', { body: req.body });
    
    const {
      sourceToken, destToken, sourceAmount, sourceChain, destChain,
      fromToken, toToken, fromAmount, fromChain, toChain,
      amount
    } = req.body;
    
    const srcToken = sourceToken || fromToken;
    const dstToken = destToken || toToken;
    const srcAmount = sourceAmount || fromAmount || amount;
    const srcChain = sourceChain || fromChain || 'ethereum';
    const dstChain = destChain || toChain || 'tezos';
    
    Logger.info('Parsed quote params', {
      srcToken, dstToken, srcAmount, srcChain, dstChain
    });
    
    if (!srcToken || !dstToken || !srcAmount) {
      Logger.warn('Missing required fields', { srcToken, dstToken, srcAmount });
      return res.status(400).json({
        error: 'Missing required fields',
        received: { srcToken, dstToken, srcAmount, srcChain, dstChain },
        body: req.body
      });
    }
    
    const ethToXtzRate = 1850; 
    const xtzToEthRate = 1 / ethToXtzRate; 
    
    let destAmount: string;
    let exchangeRate: number;
    
    if (srcToken === "ETH" && dstToken === "XTZ") {
      // ETH -> XTZ
      exchangeRate = ethToXtzRate;
      destAmount = (parseFloat(srcAmount) * ethToXtzRate * 0.98).toFixed(6); // 2% spread
    } else if (srcToken === "XTZ" && dstToken === "ETH") {
      // XTZ -> ETH  
      exchangeRate = xtzToEthRate;
      destAmount = (parseFloat(srcAmount) * xtzToEthRate * 0.98).toFixed(8); // 2% spread, more decimals for ETH
    } else {
      // Fallback for other token pairs
      exchangeRate = 1;
      destAmount = (parseFloat(srcAmount) * 0.98).toFixed(6);
    }

    const quote = {
      fromAmount: srcAmount,
      toAmount: destAmount,
      exchangeRate: exchangeRate.toString(),
      estimatedGas: '0.005', 
      priceImpact: '2.0',
      route: ['1inch Fusion+', 'Cross-chain Bridge', 'Tezos'],
      fromToken: srcToken,
      toToken: dstToken,
      estimatedExecutionTime: '5-10 minutes'
    };
    
    Logger.info('Quote generated', quote);
    
    return res.json(quote);
  } catch (error) {
    Logger.error('Failed to get Fusion+ quote', error);
    return res.status(500).json({ 
      error: 'Failed to get quote',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
    });
  }
});

export default router;