import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Logger } from './utils/logger';
import { DatabaseSetup } from './utils/database-setup';
import { RelayerService } from './services/relayerService';
import { BlockchainService } from './services/blockchainService';

import ordersRouter from './routes/orders';
import swapsRouter from './routes/swaps';
import statusRouter from './routes/status';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

app.use('/api/orders', ordersRouter);
app.use('/api/swaps', swapsRouter);
app.use('/api/status', statusRouter);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'SwapTezos Backend'
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Logger.error('Unhandled error', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

async function initializeApp() {
  try {
    Logger.info('Initializing SwapTezos Backend...');
    
    await DatabaseSetup.setup();
    
    if (process.env.ENABLE_MONITORING !== 'false') {
      Logger.info('Starting blockchain monitoring services...');
      BlockchainService.startBlockSubscription();
      RelayerService.startMonitoring(30000);
    }
    
    Logger.info('Application initialized successfully');
  } catch (error) {
    Logger.error('Failed to initialize application', error);
    process.exit(1);
  }
}

async function startServer() {
  try {
    await initializeApp();
    
    app.listen(PORT, () => {
      Logger.info(`🚀 SwapTezos Backend running on port ${PORT}`);
      Logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      Logger.info(`🔗 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
      Logger.info(`⛓️  Ethereum RPC: ${process.env.ETHEREUM_RPC_URL || 'Using default'}`);
      Logger.info(`🏛️  Tezos RPC: ${process.env.TEZOS_RPC_URL || 'Using default'}`);
      
      Logger.info('🎯 Available endpoints:');
      Logger.info('   POST /api/orders - Create new swap order');
      Logger.info('   GET  /api/orders/:id - Get order details');
      Logger.info('   POST /api/swaps/:orderId/execute - Execute swap as resolver');
      Logger.info('   GET  /api/swaps/:id - Get swap details');
      Logger.info('   GET  /api/status/:swapId - Get real-time swap status');
      Logger.info('   GET  /api/status/health - System health check');
    });
  } catch (error) {
    Logger.error('Failed to start server', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled rejection at Promise', { reason, promise });
  process.exit(1);
});

startServer();

export default app; 