import express from 'express';
import { SwapModel } from '../models/Swap';
import { OrderService } from '../services/orderService';
import { ResolverService, ResolveOrderRequest } from '../services/resolverService';
import { TransactionModel } from '../models/Transaction';
import { Logger } from '../utils/logger';

const router = express.Router();

router.post('/:orderId/execute', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { resolverAddress } = req.body;
    
    if (!resolverAddress) {
      return res.status(400).json({ 
        error: 'Resolver address is required' 
      });
    }

    const order = await OrderService.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Order is not available for execution' 
      });
    }

    const existingSwap = await SwapModel.findByOrderId(orderId);
    if (existingSwap) {
      return res.status(400).json({ 
        error: 'Swap already exists for this order' 
      });
    }

    const request: ResolveOrderRequest = {
      orderId,
      resolverAddress
    };
    
    const swap = await ResolverService.executeSwap(request);
    
    res.status(201).json({
      success: true,
      data: {
        swapId: swap.id,
        orderId: swap.order_id,
        resolverAddress: swap.resolver_address,
        status: swap.status,
        ethereumTxHash: swap.ethereum_tx_hash,
        tezosTxHash: swap.tezos_tx_hash
      }
    });
  } catch (error) {
    Logger.error('Failed to execute swap', error);
    res.status(500).json({ 
      error: 'Failed to execute swap',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const swap = await SwapModel.findById(id);
    if (!swap) {
      return res.status(404).json({ 
        error: 'Swap not found' 
      });
    }

    const order = await OrderService.getOrder(swap.order_id);
    
    const transactions = await TransactionModel.findBySwapId(id);
    
    res.json({
      success: true,
      data: {
        swap,
        order,
        transactions
      }
    });
  } catch (error) {
    Logger.error('Failed to get swap', error);
    res.status(500).json({ 
      error: 'Failed to get swap',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.post('/:id/claim', async (req, res) => {
  try {
    const { id } = req.params;
    const { secret, claimerAddress } = req.body;
    
    if (!secret) {
      return res.status(400).json({ 
        error: 'Secret is required' 
      });
    }

    if (!claimerAddress) {
      return res.status(400).json({ 
        error: 'Claimer address is required' 
      });
    }

    const swap = await SwapModel.findById(id);
    if (!swap) {
      return res.status(404).json({ 
        error: 'Swap not found' 
      });
    }

    if (swap.status !== 'claimed') {
      return res.status(400).json({ 
        error: 'Swap is not ready for claiming' 
      });
    }

    res.json({
      success: true,
      message: 'Claim initiated',
      data: {
        swapId: id,
        claimerAddress,
        status: 'claiming'
      }
    });
  } catch (error) {
    Logger.error('Failed to claim swap', error);
    res.status(500).json({ 
      error: 'Failed to claim swap',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.post('/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const { refunderAddress } = req.body;
    
    if (!refunderAddress) {
      return res.status(400).json({ 
        error: 'Refunder address is required' 
      });
    }

    const swap = await SwapModel.findById(id);
    if (!swap) {
      return res.status(404).json({ 
        error: 'Swap not found' 
      });
    }

    const order = await OrderService.getOrder(swap.order_id);
    if (!order) {
      return res.status(404).json({ 
        error: 'Associated order not found' 
      });
    }

    if (new Date() < order.timelock) {
      return res.status(400).json({ 
        error: 'Timelock has not expired yet',
        timelock: order.timelock
      });
    }

    if (swap.status !== 'deposited') {
      return res.status(400).json({ 
        error: 'Swap is not eligible for refund' 
      });
    }

    await SwapModel.updateStatus(id, 'refunded');
    await OrderService.updateOrderStatus(order.id, 'expired');
    
    res.json({
      success: true,
      message: 'Refund initiated',
      data: {
        swapId: id,
        refunderAddress,
        status: 'refunded'
      }
    });
  } catch (error) {
    Logger.error('Failed to refund swap', error);
    res.status(500).json({ 
      error: 'Failed to refund swap',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, resolverAddress, limit = '10', offset = '0' } = req.query;
    
    res.json({
      success: true,
      data: [],
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: 0
      }
    });
  } catch (error) {
    Logger.error('Failed to list swaps', error);
    res.status(500).json({ 
      error: 'Failed to list swaps',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;