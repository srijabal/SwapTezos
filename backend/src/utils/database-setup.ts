import fs from 'fs';
import path from 'path';
import pool from '../config/database';
import { Logger } from './logger';

export class DatabaseSetup {
  static async initializeDatabase(): Promise<void> {
    try {
      Logger.info('Initializing database schema...');
      
      const schemaPath = path.join(__dirname, '../config/database-init.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      await pool.query(schema);
      
      Logger.info('Database schema initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize database schema', error);
      throw error;
    }
  }

  static async checkDatabaseSchema(): Promise<boolean> {
    try {
      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('orders', 'swaps', 'transactions')
      `;
      
      const result = await pool.query(query);
      const expectedTables = ['orders', 'swaps', 'transactions'];
      const existingTables = result.rows.map(row => row.table_name);
      
      return expectedTables.every(table => existingTables.includes(table));
    } catch (error) {
      Logger.error('Failed to check database schema', error);
      return false;
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      await pool.query('SELECT NOW()');
      Logger.info('Database connection successful');
      return true;
    } catch (error) {
      Logger.error('Database connection failed', error);
      return false;
    }
  }

  static async runMigrations(): Promise<void> {
    try {
      Logger.info('Checking for database migrations...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      const result = await pool.query('SELECT name FROM migrations');
      const executedMigrations = result.rows.map(row => row.name);
      
      const availableMigrations: string[] = [];
      
      for (const migration of availableMigrations) {
        if (!executedMigrations.includes(migration)) {
          Logger.info(`Running migration: ${migration}`);
          
          await pool.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [migration]
          );
          
          Logger.info(`Migration completed: ${migration}`);
        }
      }
      
      Logger.info('All migrations completed');
    } catch (error) {
      Logger.error('Failed to run migrations', error);
      throw error;
    }
  }

  static async seedTestData(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      Logger.warn('Skipping test data seeding in production');
      return;
    }

    try {
      Logger.info('Seeding test data...');
      
      const orderCount = await pool.query('SELECT COUNT(*) FROM orders');
      if (parseInt(orderCount.rows[0].count) > 0) {
        Logger.info('Test data already exists, skipping seed');
        return;
      }

      const testOrders = [
        {
          maker_address: '0x1234567890123456789012345678901234567890',
          source_chain: 'ethereum',
          dest_chain: 'tezos',
          source_token: '0x0000000000000000000000000000000000000000',
          dest_token: 'KT1TUx83WuwtA2Ku1pi6A9AZqov7CZfYtLUS',
          source_amount: '1.0',
          dest_amount: '100.0',
          secret_hash: '0xabc1234567890123456789012345678901234567890123456789012345678901',
          timelock: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
        },
        {
          maker_address: 'tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb',
          source_chain: 'tezos',
          dest_chain: 'ethereum',
          source_token: 'KT1TUx83WuwtA2Ku1pi6A9AZqov7CZfYtLUS',
          dest_token: '0x0000000000000000000000000000000000000000',
          source_amount: '100.0',
          dest_amount: '1.0',
          secret_hash: '0xdef4567890123456789012345678901234567890123456789012345678901234',
          timelock: new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now
        }
      ];

      for (const order of testOrders) {
        await pool.query(`
          INSERT INTO orders (
            maker_address, source_chain, dest_chain, source_token, dest_token,
            source_amount, dest_amount, secret_hash, timelock
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          order.maker_address,
          order.source_chain,
          order.dest_chain,
          order.source_token,
          order.dest_token,
          order.source_amount,
          order.dest_amount,
          order.secret_hash,
          order.timelock
        ]);
      }
      
      Logger.info('Test data seeded successfully');
    } catch (error) {
      Logger.error('Failed to seed test data', error);
      throw error;
    }
  }

  static async setup(): Promise<void> {
    try {
      Logger.info('Starting database setup...');
      
      const connected = await this.testConnection();
      if (!connected) {
        throw new Error('Cannot connect to database');
      }

      const schemaExists = await this.checkDatabaseSchema();
      
      if (!schemaExists) {
        Logger.info('Database schema not found, initializing...');
        await this.initializeDatabase();
      } else {
        Logger.info('Database schema exists');
      }

      await this.runMigrations();

      if (process.env.NODE_ENV === 'development') {
        await this.seedTestData();
      }

      Logger.info('Database setup completed successfully');
    } catch (error) {
      Logger.error('Database setup failed', error);
      throw error;
    }
  }
    
  static async cleanup(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database cleanup not allowed in production');
    }

    try {
      Logger.warn('Cleaning up database...');
      
      await pool.query('TRUNCATE TABLE transactions CASCADE');
      await pool.query('TRUNCATE TABLE swaps CASCADE');
      await pool.query('TRUNCATE TABLE orders CASCADE');
      
      Logger.info('Database cleanup completed');
    } catch (error) {
      Logger.error('Database cleanup failed', error);
      throw error;
    }
  }
}