import pool from '../config/database';

export interface Order {
  id: string;
  maker_address: string;
  source_chain: string;
  dest_chain: string;
  source_token: string;
  dest_token: string;
  source_amount: string;
  dest_amount: string;
  secret_hash: string;
  timelock: Date;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'expired';
  created_at: Date;
}

export class OrderModel {
  static async create(order: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    const query = `
      INSERT INTO orders (
        maker_address, source_chain, dest_chain, source_token, dest_token,
        source_amount, dest_amount, secret_hash, timelock, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      order.maker_address,
      order.source_chain,
      order.dest_chain,
      order.source_token,
      order.dest_token,
      order.source_amount,
      order.dest_amount,
      order.secret_hash,
      order.timelock,
      order.status
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Order | null> {
    const query = 'SELECT * FROM orders WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByStatus(status: Order['status']): Promise<Order[]> {
    const query = 'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [status]);
    return result.rows;
  }

  static async updateStatus(id: string, status: Order['status']): Promise<Order | null> {
    const query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0] || null;
  }

  static async findExpired(): Promise<Order[]> {
    const query = 'SELECT * FROM orders WHERE timelock < NOW() AND status = $1';
    const result = await pool.query(query, ['active']);
    return result.rows;
  }
} 