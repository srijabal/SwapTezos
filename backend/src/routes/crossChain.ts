import express from 'express';
import { CrossChainSwapService, CrossChainSwapParams } from '../services/crossChainSwapService';
import { Logger } from '../utils/logger';

const router = express.Router();

export interface CreateSwapRequest {
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

export interface ClaimSwapRequest {
  swapId: string;
  secret: string;
}

router.post('/swaps', async (req, res) => {
  try {
    const swapRequest: CreateSwapRequest = req.body;
    
    const requiredFields = [
      'makerAddress', 'tezosRecipient', 'sourceChain', 'destChain',
      'sourceToken', 'destToken', 'sourceAmount', 'destAmount', 'timelockHours'
    ];
    
    for (const field of requiredFields) {
      if (!swapRequest[field as keyof CreateSwapRequest]) {
        return res.status(400).json({
          error: 'Missing required field',
          field
        });
      }
    }

    const supportedChains = ['ethereum', 'tezos'];
    if (!supportedChains.includes(swapRequest.sourceChain) || 
        !supportedChains.includes(swapRequest.destChain)) {
      return res.status(400).json({
        error: 'Invalid chain. Supported chains: ethereum, tezos'
      });
    }

    if (swapRequest.sourceChain === swapRequest.destChain) {
      return res.status(400).json({
        error: 'Source and destination chains must be different'
      });
    }

    if (parseFloat(swapRequest.sourceAmount) <= 0 || 
        parseFloat(swapRequest.destAmount) <= 0) {
      return res.status(400).json({
        error: 'Amounts must be greater than 0'
      });
    }

    if (swapRequest.timelockHours < 1 || swapRequest.timelockHours > 168) {
      return res.status(400).json({
        error: 'Timelock must be between 1 hour and 168 hours (1 week)'
      });
    }

    const swapParams: CrossChainSwapParams = {
      makerAddress: swapRequest.makerAddress,
      tezosRecipient: swapRequest.tezosRecipient,
      sourceChain: swapRequest.sourceChain,
      destChain: swapRequest.destChain,
      sourceToken: swapRequest.sourceToken,
      destToken: swapRequest.destToken,
      sourceAmount: swapRequest.sourceAmount,
      destAmount: swapRequest.destAmount,
      timelockHours: swapRequest.timelockHours
    };

    const result = await CrossChainSwapService.createCrossChainSwap(swapParams);

    return res.status(201).json({
      success: true,
      data: {
        swapId: result.swapId,
        secretHash: result.secretHash,
        ethereumSwapId: result.ethereumSwapId,
        tezosSwapId: result.tezosSwapId,
        fusionOrderHash: result.fusionOrderHash,
        status: result.status,
        expirationTime: result.expirationTime
      }
    });

  } catch (error) {
    Logger.error('Failed to create cross-chain swap', error);
    return res.status(500).json({
      error: 'Failed to create cross-chain swap',
      message: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : 'Unknown error' 
        : 'Internal server error'
    });
  }
});

router.get('/swaps/:swapId', async (req, res) => {
  try {
    const { swapId } = req.params;
    
    const swapStatus = await CrossChainSwapService.getSwapStatus(swapId);
    if (!swapStatus) {
      return res.status(404).json({
        error: 'Swap not found'
      });
    }

    return res.json({
      success: true,
      data: swapStatus
    });

  } catch (error) {
    Logger.error('Failed to get swap status', error);
    return res.status(500).json({
      error: 'Failed to get swap status',
      message: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : 'Unknown error' 
        : 'Internal server error'
    });
  }
});

router.post('/swaps/:swapId/claim', async (req, res) => {
  try {
    const { swapId } = req.params;
    const { secret }: ClaimSwapRequest = req.body;
    
    if (!secret) {
      return res.status(400).json({
        error: 'Secret is required'
      });
    }

    const success = await CrossChainSwapService.claimSwap(swapId, secret);
    
    if (success) {
      return res.json({
        success: true,
        message: 'Swap claimed successfully'
      });
    } else {
      return res.status(400).json({
        error: 'Failed to claim swap'
      });
    }

  } catch (error) {
    Logger.error('Failed to claim swap', error);
    return res.status(500).json({
      error: 'Failed to claim swap',
      message: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : 'Unknown error' 
        : 'Internal server error'
    });
  }
});

router.get('/swaps', async (req, res) => {
  try {
    const { limit = '50', offset = '0' } = req.query;
    
    const swaps = await CrossChainSwapService.listActiveSwaps();
      
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedSwaps = swaps.slice(offsetNum, offsetNum + limitNum);
    
    return res.json({
      success: true,
      data: paginatedSwaps,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: swaps.length
      }
    });

  } catch (error) {
    Logger.error('Failed to list swaps', error);
    return res.status(500).json({
      error: 'Failed to list swaps',
      message: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : 'Unknown error' 
        : 'Internal server error'
    });
  }
});

export default router;