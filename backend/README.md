# SwapTezos Backend

Backend service for the SwapTezos cross-chain swap dApp, implementing 1inch Fusion+ principles for atomic swaps between Ethereum and Tezos.

## Features

- **Order Management**: Create and track swap orders
- **HTLC Operations**: Hash Time-Locked Contract operations
- **Cross-Chain Coordination**: Ethereum ↔ Tezos swap coordination
- **Resolver Service**: Automated swap execution
- **Database Integration**: PostgreSQL for order tracking

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Blockchain**: 
  - Ethereum: ethers.js
  - Tezos: Taquito
- **Security**: Crypto utilities for HTLC operations

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Database models
│   ├── services/        # Business logic
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── app.ts           # Main application
├── contracts/           # Smart contracts (future)
└── tests/              # Test files (future)
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
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
-- Create database
CREATE DATABASE swaptezos;

-- Create tables (SQL scripts to be added)
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

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details

### Swaps
- `GET /api/swaps` - List swaps
- `POST /api/swaps/:orderId/execute` - Execute swap
- `GET /api/swaps/:id` - Get swap status

## Environment Variables

See `env.example` for all required environment variables.

## Development Status

- ✅ Project structure setup
- ✅ Basic Express server
- ✅ Database models
- ✅ Order service
- 🔄 Smart contract integration (in progress)
- 🔄 Resolver service (planned)
- 🔄 Relayer service (planned)

## Next Steps

1. Implement Tezos HTLC smart contract
2. Add Ethereum 1inch Fusion integration
3. Build resolver service
4. Create API routes
5. Add comprehensive testing

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

ISC 