import express from 'express';
import { OrderService, CreateOrderRequest } from '../services/orderService';
import { ResolverService } from '../services/resolverService';
import { Logger } from '../utils/logger';

const router = express.Router();

router.post('/', async (req, res) => {
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

    const validChains = ['ethereum', 'tezos'];
    if (!validChains.includes(orderRequest.sourceChain) || 
        !validChains.includes(orderRequest.destChain)) {
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

    if (orderRequest.timelockMinutes < 60 || orderRequest.timelockMinutes > 1440) {
      return res.status(400).json({ 
        error: 'Timelock must be between 1 hour and 24 hours' 
      });
    }

    const order = await OrderService.createOrder(orderRequest);
    
    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        secretHash: order.secret_hash,
        timelock: order.timelock,
        status: order.status
      }
    });
  } catch (error) {
    Logger.error('Failed to create order', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await OrderService.getOrder(id);
    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    Logger.error('Failed to get order', error);
    res.status(500).json({ 
      error: 'Failed to get order',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


router.get('/', async (req, res) => {
  try {
    const { status, sourceChain, destChain, limit = '10', offset = '0' } = req.query;
    
    const orders = await OrderService.getActiveOrders();
    
    res.json({
      success: true,
      data: orders.slice(
        parseInt(offset as string), 
        parseInt(offset as string) + parseInt(limit as string)
      ),
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: orders.length
      }
    });
  } catch (error) {
    Logger.error('Failed to list orders', error);
    res.status(500).json({ 
      error: 'Failed to list orders',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        error: 'Status is required' 
      });
    }

    const validStatuses = ['pending', 'active', 'completed', 'cancelled', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        validStatuses 
      });
    }

    const order = await OrderService.updateOrderStatus(id, status);
    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    Logger.error('Failed to update order status', error);
    res.status(500).json({ 
      error: 'Failed to update order status',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


router.post('/:id/estimate', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolverAddress } = req.body;
    
    if (!resolverAddress) {
      return res.status(400).json({ 
        error: 'Resolver address is required' 
      });
    }

    const order = await OrderService.getOrder(id);
    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Order is not available for resolution' 
      });
    }

    const hasBalance = await ResolverService.checkResolverBalance(resolverAddress, order);
    if (!hasBalance) {
      return res.status(400).json({ 
        error: 'Resolver has insufficient balance' 
      });
    }

    const fee = ResolverService.calculateResolverFee(order);
    
    res.json({
      success: true,
      data: {
        resolverFee: fee,
        estimatedGasCosts: {
          ethereum: '0.01',
          tezos: '0.005'
        },
        canResolve: hasBalance
      }
    });
  } catch (error) {
    Logger.error('Failed to estimate resolver fee', error);
    res.status(500).json({ 
      error: 'Failed to estimate resolver fee',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;