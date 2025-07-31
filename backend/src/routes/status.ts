import express from 'express';
import { SwapModel } from '../models/Swap';
import { OrderService } from '../services/orderService';
import { TransactionModel } from '../models/Transaction';
import { BlockchainService } from '../services/blockchainService';
import { Logger } from '../utils/logger';

const router = express.Router();

router.get('/:swapId', async (req, res) => {
  try {
    const { swapId } = req.params;
    
    const swap = await SwapModel.findById(swapId);
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

    const transactions = await TransactionModel.findBySwapId(swapId);
    
    const blockchainTxs = await Promise.all(
      transactions.map(async (tx) => {
        if (tx.chain === 'ethereum' && tx.tx_hash) {
          return await BlockchainService.getEthereumTransaction(tx.tx_hash);
        } else if (tx.chain === 'tezos' && tx.tx_hash) {
          return await BlockchainService.getTezosTransaction(tx.tx_hash);
        }
        return null;
      })
    );

    let progress = 0;
    switch (swap.status) {
      case 'pending':
        progress = 10;
        break;
      case 'deposited':
        progress = 50;
        break;
      case 'claimed':
        progress = 90;
        break;
      case 'completed':
        progress = 100;
        break;
      case 'refunded':
      case 'failed':
        progress = 0;
        break;
    }

    const isExpired = new Date() > order.timelock;
    const timeRemaining = isExpired ? 0 : order.timelock.getTime() - Date.now();

    res.json({
      success: true,
      data: {
        swapId: swap.id,
        orderId: swap.order_id,
        status: swap.status,
        progress,
        timelock: order.timelock,
        timeRemaining,
        isExpired,
        transactions: transactions.map((tx, index) => ({
          ...tx,
          blockchainDetails: blockchainTxs[index]
        })),
        order: {
          sourceChain: order.source_chain,
          destChain: order.dest_chain,
          sourceAmount: order.source_amount,
          destAmount: order.dest_amount,
          sourceToken: order.source_token,
          destToken: order.dest_token
        }
      }
    });
  } catch (error) {
    Logger.error('Failed to get swap status', error);
    res.status(500).json({ 
      error: 'Failed to get swap status',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


router.get('/transactions/:swapId', async (req, res) => {
  try {
    const { swapId } = req.params;
    
    const swap = await SwapModel.findById(swapId);
    if (!swap) {
      return res.status(404).json({ 
        error: 'Swap not found' 
      });
    }

    const transactions = await TransactionModel.findBySwapId(swapId);
    
    const detailedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        let blockchainDetails = null;
        
        if (tx.tx_hash) {
          if (tx.chain === 'ethereum') {
            blockchainDetails = await BlockchainService.getEthereumTransaction(tx.tx_hash);
          } else if (tx.chain === 'tezos') {
            blockchainDetails = await BlockchainService.getTezosTransaction(tx.tx_hash);
          }
        }

        return {
          ...tx,
          blockchainDetails
        };
      })
    );

    res.json({
      success: true,
      data: detailedTransactions
    });
  } catch (error) {
    Logger.error('Failed to get transaction history', error);
    res.status(500).json({ 
      error: 'Failed to get transaction history',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
    
    res.status(status).json({
      success: allHealthy,
      data: health
    });
  } catch (error) {
    Logger.error('Health check failed', error);
    res.status(503).json({ 
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

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    Logger.error('Failed to get stats', error);
    res.status(500).json({ 
      error: 'Failed to get stats',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;