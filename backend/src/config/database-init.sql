-- SwapTezos Database Schema
-- This file contains the complete database schema for the SwapTezos backend
-- Updated for 1inch Fusion+ integration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cross-chain orders linked to 1inch Fusion+
CREATE TABLE IF NOT EXISTS fusion_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fusion_order_hash VARCHAR(66) UNIQUE, -- 1inch Fusion+ order hash
  maker_address VARCHAR(42) NOT NULL,
  source_chain VARCHAR(10) NOT NULL CHECK (source_chain = 'ethereum'), -- Only Ethereum for now
  dest_chain VARCHAR(10) NOT NULL CHECK (dest_chain = 'tezos'), -- Only Tezos for now
  source_token VARCHAR(42) NOT NULL,
  dest_token VARCHAR(42) NOT NULL, -- Tezos token address
  source_amount DECIMAL(36, 18) NOT NULL CHECK (source_amount > 0),
  dest_amount DECIMAL(36, 18) NOT NULL CHECK (dest_amount > 0),
  secret_hash VARCHAR(66) NOT NULL, -- For HTLC coordination
  fusion_auction_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  fusion_auction_duration INTEGER NOT NULL CHECK (fusion_auction_duration > 0), -- seconds
  tezos_timelock_hours INTEGER NOT NULL CHECK (tezos_timelock_hours BETWEEN 1 AND 72), -- HTLC timelock duration
  status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'matched', 'resolved', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-chain swap execution tracking
CREATE TABLE IF NOT EXISTS cross_chain_swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fusion_order_id UUID NOT NULL REFERENCES fusion_orders(id) ON DELETE CASCADE,
  resolver_address VARCHAR(42) NOT NULL,
  fusion_settlement_hash VARCHAR(66), -- Ethereum settlement tx
  tezos_htlc_address VARCHAR(36), -- Tezos HTLC contract address
  tezos_htlc_id INTEGER, -- HTLC ID within contract
  tezos_deposit_hash VARCHAR(51), -- Tezos operation hash
  secret_revealed_at TIMESTAMP WITH TIME ZONE,
  secret VARCHAR(66),
  status VARCHAR(20) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'deposited', 'revealed', 'claimed', 'refunded', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one swap per fusion order
  UNIQUE(fusion_order_id)
);

-- Multi-chain transaction monitoring
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swap_id UUID NOT NULL REFERENCES cross_chain_swaps(id) ON DELETE CASCADE,
  chain VARCHAR(10) NOT NULL CHECK (chain IN ('ethereum', 'tezos')),
  tx_hash VARCHAR(66) NOT NULL,
  tx_type VARCHAR(30) NOT NULL CHECK (tx_type IN ('fusion_order', 'fusion_settlement', 'htlc_create', 'htlc_claim', 'htlc_refund')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_number BIGINT,
  gas_used BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure unique transaction hashes per chain
  UNIQUE(chain, tx_hash)
);

-- Order secrets storage (encrypted in production)
CREATE TABLE IF NOT EXISTS order_secrets (
  order_hash VARCHAR(66) PRIMARY KEY,
  secret VARCHAR(66) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maker_address VARCHAR(42) NOT NULL,
  source_chain VARCHAR(10) NOT NULL CHECK (source_chain IN ('ethereum', 'tezos')),
  dest_chain VARCHAR(10) NOT NULL CHECK (dest_chain IN ('ethereum', 'tezos')),
  source_token VARCHAR(42) NOT NULL,
  dest_token VARCHAR(42) NOT NULL,
  source_amount DECIMAL(36, 18) NOT NULL CHECK (source_amount > 0),
  dest_amount DECIMAL(36, 18) NOT NULL CHECK (dest_amount > 0),
  secret_hash VARCHAR(66) NOT NULL,
  timelock TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT different_chains CHECK (source_chain != dest_chain),
  CONSTRAINT valid_timelock CHECK (timelock > NOW())
);

-- Swaps table
CREATE TABLE IF NOT EXISTS swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  resolver_address VARCHAR(42) NOT NULL,
  ethereum_tx_hash VARCHAR(66),
  tezos_tx_hash VARCHAR(66),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deposited', 'claimed', 'refunded', 'failed')),
  secret VARCHAR(66),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one swap per order
  UNIQUE(order_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swap_id UUID NOT NULL REFERENCES swaps(id) ON DELETE CASCADE,
  chain VARCHAR(10) NOT NULL CHECK (chain IN ('ethereum', 'tezos')),
  tx_hash VARCHAR(66) NOT NULL,
  tx_type VARCHAR(20) NOT NULL CHECK (tx_type IN ('deposit', 'claim', 'refund')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_number BIGINT,
  gas_used VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique transaction hashes
  UNIQUE(tx_hash)
);

-- Indexes for better query performance
-- Fusion+ related indexes
CREATE INDEX IF NOT EXISTS idx_fusion_orders_status ON fusion_orders(status);
CREATE INDEX IF NOT EXISTS idx_fusion_orders_maker ON fusion_orders(maker_address);
CREATE INDEX IF NOT EXISTS idx_fusion_orders_fusion_hash ON fusion_orders(fusion_order_hash);
CREATE INDEX IF NOT EXISTS idx_fusion_orders_auction_time ON fusion_orders(fusion_auction_start_time);
CREATE INDEX IF NOT EXISTS idx_fusion_orders_created_at ON fusion_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_cross_chain_swaps_fusion_order ON cross_chain_swaps(fusion_order_id);
CREATE INDEX IF NOT EXISTS idx_cross_chain_swaps_resolver ON cross_chain_swaps(resolver_address);
CREATE INDEX IF NOT EXISTS idx_cross_chain_swaps_status ON cross_chain_swaps(status);
CREATE INDEX IF NOT EXISTS idx_cross_chain_swaps_created_at ON cross_chain_swaps(created_at);

CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_swap_id ON blockchain_transactions(swap_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_chain ON blockchain_transactions(chain);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_tx_type ON blockchain_transactions(tx_type);

CREATE INDEX IF NOT EXISTS idx_order_secrets_order_hash ON order_secrets(order_hash);

-- Legacy indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_maker ON orders(maker_address);
CREATE INDEX IF NOT EXISTS idx_orders_source_chain ON orders(source_chain);
CREATE INDEX IF NOT EXISTS idx_orders_dest_chain ON orders(dest_chain);
CREATE INDEX IF NOT EXISTS idx_orders_timelock ON orders(timelock);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_swaps_order_id ON swaps(order_id);
CREATE INDEX IF NOT EXISTS idx_swaps_resolver ON swaps(resolver_address);
CREATE INDEX IF NOT EXISTS idx_swaps_status ON swaps(status);
CREATE INDEX IF NOT EXISTS idx_swaps_created_at ON swaps(created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_swap_id ON transactions(swap_id);
CREATE INDEX IF NOT EXISTS idx_transactions_chain ON transactions(chain);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_type ON transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
-- Fusion+ tables
DROP TRIGGER IF EXISTS update_fusion_orders_updated_at ON fusion_orders;
CREATE TRIGGER update_fusion_orders_updated_at 
    BEFORE UPDATE ON fusion_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cross_chain_swaps_updated_at ON cross_chain_swaps;
CREATE TRIGGER update_cross_chain_swaps_updated_at 
    BEFORE UPDATE ON cross_chain_swaps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Legacy tables
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_swaps_updated_at ON swaps;
CREATE TRIGGER update_swaps_updated_at 
    BEFORE UPDATE ON swaps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW active_swaps AS
SELECT 
    s.*,
    o.source_chain,
    o.dest_chain,
    o.source_amount,
    o.dest_amount,
    o.timelock,
    o.secret_hash
FROM swaps s
JOIN orders o ON s.order_id = o.id
WHERE s.status IN ('pending', 'deposited')
    AND o.timelock > NOW();

CREATE OR REPLACE VIEW expired_orders AS
SELECT *
FROM orders
WHERE timelock <= NOW()
    AND status = 'active';

CREATE OR REPLACE VIEW swap_summary AS
SELECT 
    s.id as swap_id,
    s.order_id,
    s.resolver_address,
    s.status as swap_status,
    s.created_at as swap_created_at,
    o.maker_address,
    o.source_chain,
    o.dest_chain,
    o.source_amount,
    o.dest_amount,
    o.timelock,
    o.status as order_status,
    COUNT(t.id) as transaction_count,
    COUNT(CASE WHEN t.status = 'confirmed' THEN 1 END) as confirmed_transactions
FROM swaps s
JOIN orders o ON s.order_id = o.id
LEFT JOIN transactions t ON s.id = t.swap_id
GROUP BY s.id, o.id;

-- Sample data for development (comment out for production)
-- INSERT INTO orders (maker_address, source_chain, dest_chain, source_token, dest_token, source_amount, dest_amount, secret_hash, timelock)
-- VALUES 
-- ('0x1234567890123456789012345678901234567890', 'ethereum', 'tezos', '0x0000000000000000000000000000000000000000', 'KT1...', '1.0', '100.0', '0xabc123...', NOW() + INTERVAL '2 hours'),
-- ('tz1ABC...', 'tezos', 'ethereum', 'KT1...', '0x0000000000000000000000000000000000000000', '100.0', '1.0', '0xdef456...', NOW() + INTERVAL '3 hours');

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO swaptezos_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO swaptezos_user;