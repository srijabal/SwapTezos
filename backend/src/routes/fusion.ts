import express from 'express';
import { OrderService, CreateOrderRequest } from '../services/orderService';
import { FusionOrderService } from '../services/fusionOrderService';
import { Logger } from '../utils/logger';

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

    const fusionOrder = await OrderService.createCrossChainOrder(orderRequest);
    
    res.status(201).json({
      success: true,
      data: {
        orderHash: fusionOrder.orderHash,
        secretHash: fusionOrder.crossChainData.secretHash,
        targetChain: fusionOrder.crossChainData.targetChain,
        tezosRecipient: fusionOrder.crossChainData.tezosRecipient,
        timelockHours: fusionOrder.crossChainData.timelockHours,
        fusionOrder: fusionOrder.fusionOrder
      }
    });
  } catch (error) {
    Logger.error('Failed to create Fusion+ order', error);
    res.status(500).json({ 
      error: 'Failed to create Fusion+ order',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/orders/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const orderStatus = await FusionOrderService.getOrderStatus(orderHash);
    if (!orderStatus) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    res.json({
      success: true,
      data: orderStatus
    });
  } catch (error) {
    Logger.error('Failed to get Fusion+ order', error);
    res.status(500).json({ 
      error: 'Failed to get Fusion+ order',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
    
    res.json({
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
    res.status(500).json({ 
      error: 'Failed to list Fusion+ orders',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.post('/orders/:orderHash/cancel', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
    const success = await FusionOrderService.cancelOrder(orderHash);
    
    if (success) {
      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } else {
      res.status(400).json({
        error: 'Failed to cancel order'
      });
    }
  } catch (error) {
    Logger.error('Failed to cancel Fusion+ order', error);
    res.status(500).json({ 
      error: 'Failed to cancel Fusion+ order',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/resolver/opportunities', async (req, res) => {
  try {
    const opportunities = await FusionOrderService.getOrdersReadyForResolution();
    
    res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    Logger.error('Failed to get resolver opportunities', error);
    res.status(500).json({ 
      error: 'Failed to get resolver opportunities',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.post('/quote', async (req, res) => {
  try {
    const { sourceToken, destToken, sourceAmount, sourceChain, destChain } = req.body;
    
    if (!sourceToken || !destToken || !sourceAmount || !sourceChain || !destChain) {
      return res.status(400).json({
        error: 'Missing required fields: sourceToken, destToken, sourceAmount, sourceChain, destChain'
      });
    }

    if (sourceChain !== 'ethereum' || destChain !== 'tezos') {
      return res.status(400).json({
        error: 'Currently only Ethereum -> Tezos swaps are supported'
      });
    }

    const mockQuote = {
      sourceToken,
      destToken,
      sourceAmount,
      destAmount: (parseFloat(sourceAmount) * 0.95).toString(), 
      expectedGasCost: '0.01', 
      estimatedExecutionTime: '5 minutes',
      priceImpact: '0.5%',
      route: ['1inch Fusion+', 'Tezos HTLC']
    };
    
    res.json({
      success: true,
      data: mockQuote
    });
  } catch (error) {
    Logger.error('Failed to get Fusion+ quote', error);
    res.status(500).json({ 
      error: 'Failed to get quote',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;