import pool from '../config/database';

export interface Swap {
  id: string;
  order_id: string;
  resolver_address: string;
  ethereum_tx_hash?: string;
  tezos_tx_hash?: string;
  status: 'pending' | 'deposited' | 'claimed' | 'refunded' | 'failed';
  secret?: string;
  created_at: Date;
}

export class SwapModel {
  static async create(swap: Omit<Swap, 'id' | 'created_at'>): Promise<Swap> {
    const query = `
      INSERT INTO swaps (
        order_id, resolver_address, ethereum_tx_hash, tezos_tx_hash, status, secret
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      swap.order_id,
      swap.resolver_address,
      swap.ethereum_tx_hash,
      swap.tezos_tx_hash,
      swap.status,
      swap.secret
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Swap | null> {
    const query = 'SELECT * FROM swaps WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByOrderId(orderId: string): Promise<Swap | null> {
    const query = 'SELECT * FROM swaps WHERE order_id = $1';
    const result = await pool.query(query, [orderId]);
    return result.rows[0] || null;
  }

  static async updateStatus(id: string, status: Swap['status']): Promise<Swap | null> {
    const query = 'UPDATE swaps SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0] || null;
  }

  static async updateTransactionHashes(
    id: string, 
    ethereumTxHash?: string, 
    tezosTxHash?: string
  ): Promise<Swap | null> {
    const query = `
      UPDATE swaps 
      SET ethereum_tx_hash = COALESCE($2, ethereum_tx_hash),
          tezos_tx_hash = COALESCE($3, tezos_tx_hash)
      WHERE id = $1 
      RETURNING *
    `;
    const result = await pool.query(query, [id, ethereumTxHash, tezosTxHash]);
    return result.rows[0] || null;
  }

  static async updateSecret(id: string, secret: string): Promise<Swap | null> {
    const query = 'UPDATE swaps SET secret = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [secret, id]);
    return result.rows[0] || null;
  }
} 