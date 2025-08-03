# SwapTezos Backend

Backend service for the SwapTezos cross-chain swap dApp, implementing 1inch Fusion+ integration for atomic swaps between Ethereum and Tezos.

## Features

- **1inch Fusion+ Integration**: Complete integration with 1inch Fusion+ API for order creation and management
- **Cross-Chain HTLC**: Hash Time-Locked Contract operations on Tezos
- **Order Management**: Create, track, and manage swap orders with real-time status updates
- **Database Integration**: PostgreSQL with Supabase for reliable data storage
- **API Services**: RESTful API for frontend integration
- **Security**: Cryptographic utilities for HTLC operations and order signing

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **Blockchain**: 
  - Ethereum: ethers.js for 1inch Fusion+ integration
  - Tezos: Taquito for HTLC contract interactions
- **APIs**: 1inch Fusion+ API integration
- **Security**: Crypto utilities for HTLC operations

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files and database setup
│   ├── models/          # Database models and types
│   ├── services/        # Business logic services
│   │   ├── fusionOrderService.ts    # 1inch Fusion+ integration
│   │   ├── contractService.ts       # Smart contract interactions
│   │   └── crossChainSwapService.ts # Cross-chain coordination
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── app.ts           # Main application
├── contracts/           # Smart contracts
│   ├── ethereum/        # Ethereum contracts
│   └── tezos/           # Tezos HTLC contracts
└── tests/              # Test files
```

## Setup

### Prerequisites

- Node.js 18+
- Supabase account
- 1inch Developer Portal API token
- Ethereum/Tezos testnet accounts

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment template:
```bash
cp env.example .env
```

3. Configure environment variables in `.env`

4. Set up database:
```sql
-- Run the database initialization script in Supabase SQL editor
-- Copy contents from src/config/database-init.sql
```

### Development

Start development server:
```bash
npm run dev
```

### Production

Build and start:
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Fusion Orders
- `GET /api/fusion/orders` - List fusion orders
- `POST /api/fusion/orders` - Create new fusion order
- `GET /api/fusion/orders/:hash` - Get order details
- `POST /api/fusion/orders/:hash/sign` - Sign order
- `DELETE /api/fusion/orders/:hash` - Cancel order

### Cross-Chain Swaps
- `GET /api/cross-chain/swaps` - List cross-chain swaps
- `POST /api/cross-chain/swaps/:orderId/execute` - Execute swap
- `GET /api/cross-chain/swaps/:id` - Get swap status

### Status
- `GET /api/status` - System status and health

## Environment Variables

Required environment variables (see `env.example` for full list):

```env
# Database
DATABASE_URL=your_supabase_url

# Ethereum
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ETHEREUM_CHAIN_ID=11155111

# Tezos
TEZOS_RPC_URL=https://ghostnet.tezos.marigold.dev
TEZOS_PRIVATE_KEY=your_tezos_private_key
TEZOS_NETWORK=ghostnet
TEZOS_HTLC_ADDRESS=your_deployed_htlc_address

# 1inch Fusion+
FUSION_RESOLVER_PRIVATE_KEY=your_resolver_private_key
DEV_PORTAL_API_TOKEN=your_1inch_api_token
FUSION_API_URL=https://api.1inch.dev/fusion-plus
```

## Core Services

### FusionOrderService

Handles 1inch Fusion+ integration:
- Order creation and preparation
- Order signing and submission
- Status tracking and updates
- Cross-chain bridge coordination

### ContractService

Manages smart contract interactions:
- Tezos HTLC deployment and management
- Ethereum contract interactions
- Cross-chain coordination

### CrossChainSwapService

Coordinates cross-chain operations:
- HTLC creation and management
- Secret generation and revelation
- Swap execution and monitoring

## Development Status

- ✅ Project structure setup
- ✅ Express server with TypeScript
- ✅ Database models and Supabase integration
- ✅ 1inch Fusion+ API integration
- ✅ Tezos HTLC contract integration
- ✅ Cross-chain swap coordination
- ✅ Order management and tracking
- ✅ Real-time status updates
- ✅ API routes and endpoints
- 🔄 Comprehensive testing (in progress)
- 🔄 Production deployment (planned)

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License 