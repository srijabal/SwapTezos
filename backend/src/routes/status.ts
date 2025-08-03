import express from 'express';
import { SwapModel } from '../models/Swap';
import { FusionOrderService } from '../services/fusionOrderService';
import { TransactionModel } from '../models/Transaction';
import { BlockchainService } from '../services/blockchainService';
import { Logger } from '../utils/logger';

const router = express.Router();

router.get('/fusion/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    
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
    Logger.error('Failed to get order status', error);
    return res.status(500).json({ 
      error: 'Failed to get order status',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
    });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const orders = await FusionOrderService.listOrders(limit, offset);
    
    return res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    Logger.error('Failed to list orders', error);
    return res.status(500).json({ 
      error: 'Failed to list orders',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
    });
  }
});


router.get('/health', async (req, res) => {
  try {
    const blockchainHealth = await BlockchainService.healthCheck();
    const blockNumbers = await BlockchainService.getCurrentBlockNumbers();
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'SwapTezos Backend',
      version: '1.0.0',
      blockchain: {
        ethereum: {
          connected: blockchainHealth.ethereum,
          currentBlock: blockNumbers.ethereum
        },
        tezos: {
          connected: blockchainHealth.tezos,
          currentBlock: blockNumbers.tezos
        }
      },
      database: {
        connected: true
      }
    };

    const allHealthy = blockchainHealth.ethereum && blockchainHealth.tezos;
    const status = allHealthy ? 200 : 503;
    
    return res.status(status).json({
      success: allHealthy,
      data: health
    });
  } catch (error) {
    Logger.error('Health check failed', error);
    return res.status(503).json({ 
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});


router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalOrders: 0,
      activeSwaps: 0,
      completedSwaps: 0,
      totalVolume: {
        ethereum: '0',
        tezos: '0'
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    Logger.error('Failed to get stats', error);
    return res.status(500).json({ 
      error: 'Failed to get stats',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : 'Internal server error'
    });
  }
});

export default router;