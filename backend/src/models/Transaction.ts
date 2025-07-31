import pool from '../config/database';

export interface Transaction {
  id: string;
  swap_id: string;
  chain: 'ethereum' | 'tezos';
  tx_hash: string;
  tx_type: 'deposit' | 'claim' | 'refund';
  status: 'pending' | 'confirmed' | 'failed';
  created_at: Date;
}

export class TransactionModel {
  static async create(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    const query = `
      INSERT INTO transactions (
        swap_id, chain, tx_hash, tx_type, status
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      transaction.swap_id,
      transaction.chain,
      transaction.tx_hash,
      transaction.tx_type,
      transaction.status
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Transaction | null> {
    const query = 'SELECT * FROM transactions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findBySwapId(swapId: string): Promise<Transaction[]> {
    const query = 'SELECT * FROM transactions WHERE swap_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [swapId]);
    return result.rows;
  }

  static async findByTxHash(txHash: string): Promise<Transaction | null> {
    const query = 'SELECT * FROM transactions WHERE tx_hash = $1';
    const result = await pool.query(query, [txHash]);
    return result.rows[0] || null;
  }

  static async updateStatus(id: string, status: Transaction['status']): Promise<Transaction | null> {
    const query = 'UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0] || null;
  }

  static async findPendingTransactions(): Promise<Transaction[]> {
    const query = 'SELECT * FROM transactions WHERE status = $1 ORDER BY created_at ASC';
    const result = await pool.query(query, ['pending']);
    return result.rows;
  }

  static async findByChain(chain: Transaction['chain']): Promise<Transaction[]> {
    const query = 'SELECT * FROM transactions WHERE chain = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [chain]);
    return result.rows;
  }
}