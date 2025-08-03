# SwapTezos

The first truly atomic cross-chain swap protocol between Ethereum & Tezos, extending 1inch Fusion+ to enable seamless cross-chain trading.

## Features

- **Atomic Cross-Chain Swaps**: Secure Ethereum to Tezos swaps using HTLC (Hashed Timelock Contracts)
- **1inch Fusion+ Integration**: Leverages 1inch Fusion+ for optimal pricing and liquidity
- **Tezos HTLC Contracts**: Smart contracts on Tezos for secure cross-chain operations
- **Real-time Order Tracking**: Live status updates and explorer integration
- **Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind CSS

## Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express and TypeScript
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: Ethereum (Sepolia) + Tezos (Ghostnet)
- **APIs**: 1inch Fusion+ API integration

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- 1inch Developer Portal API token

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SwapTezos
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   ```

3. **Environment Setup**
   ```bash
   cp backend/env.example backend/.env
   # Fill in your environment variables
   ```

4. **Database Setup**
   ```bash
   # Run the database initialization script in your Supabase SQL editor
   # Copy contents from backend/src/config/database-init.sql
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend
   cd backend && npm run dev
   ```

6. **Open the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Environment Variables

### Backend (.env)

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL=your_supabase_url

# Ethereum Configuration  
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ETHEREUM_CHAIN_ID=11155111

# Tezos Configuration
TEZOS_RPC_URL=https://ghostnet.tezos.marigold.dev
TEZOS_PRIVATE_KEY=your_tezos_private_key
TEZOS_NETWORK=ghostnet

# 1inch Fusion+ Configuration  
FUSION_RESOLVER_PRIVATE_KEY=your_resolver_private_key
DEV_PORTAL_API_TOKEN=your_1inch_api_token
FUSION_API_URL=https://api.1inch.dev/fusion-plus

# Contract Addresses
TEZOS_HTLC_ADDRESS=your_deployed_tezos_htlc_address
DEFAULT_RESOLVER_ADDRESS=your_resolver_address

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Logging
LOG_LEVEL=info
```

## Usage

1. **Connect Wallets**: Connect your Ethereum and Tezos wallets
2. **Create Swap**: Enter the amount and tokens you want to swap
3. **Review Order**: Check the exchange rate and fees
4. **Sign Order**: Sign the order with your Ethereum wallet
5. **Monitor Progress**: Track the swap status and Tezos explorer links
6. **Complete Swap**: The HTLC will automatically execute the cross-chain transfer

## Development

### Project Structure

```
SwapTezos/
├── src/                    # Frontend source
│   ├── app/               # Next.js app router
│   ├── components/        # React components
│   ├── lib/              # Utility libraries
│   └── context/          # React contexts
├── backend/               # Backend source
│   ├── src/
│   │   ├── services/     # Business logic
│   │   ├── routes/       # API routes
│   │   ├── models/       # Data models
│   │   └── config/       # Configuration
│   └── contracts/        # Smart contracts
└── public/               # Static assets
```

### Key Components

- **SwapForm**: Main swap interface
- **TezosExplorerCard**: Tezos transaction explorer
- **FusionOrderService**: 1inch Fusion+ integration
- **ContractService**: Smart contract interactions

## Smart Contracts

### Tezos HTLC Contract

Located in `backend/contracts/tezos/HTLCEscrow.py`, this contract handles:
- Secure cross-chain swaps
- Timelock mechanisms
- Secret revelation
- Automatic execution

### Ethereum Integration

Uses 1inch Fusion+ for:
- Order creation and matching
- Optimal pricing
- Liquidity aggregation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Join our community discussions
