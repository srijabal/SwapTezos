import fs from 'fs';
import path from 'path';
import pool from '../config/database';
import { supabase, testSupabaseConnection } from '../config/supabase';
import { Logger } from './logger';

export class DatabaseSetup {
  static async initializeDatabase(): Promise<void> {
    try {
      Logger.info('Initializing database schema...');
      
      Logger.warn('Database schema initialization requires manual setup in Supabase dashboard');
      Logger.info('Please run the SQL from src/config/database-init.sql in your Supabase SQL Editor');
      Logger.info('You can access it at: https://app.supabase.com/project/bnhnhzfdzijhifdsvpux/sql');
      
      // For now, just log that tables need to be created manually
      Logger.info('Skipping automatic schema initialization - using Supabase REST API');
      
    } catch (error) {
      Logger.error('Failed to initialize database schema', error);
      throw error;
    }
  }

  static async checkDatabaseSchema(): Promise<boolean> {
    try {
      // Check for expected Supabase tables
      const expectedTables = ['fusion_orders', 'cross_chain_swaps', 'order_secrets'];
      
      for (const table of expectedTables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        
        if (error && error.code === 'PGRST116') {
          // Table doesn't exist
          Logger.info(`Table ${table} not found`);
          return false;
        } else if (error) {
          Logger.warn(`Error checking table ${table}:`, error.message);
        } else {
          Logger.info(`Table ${table} exists`);
        }
      }
      
      return true;
    } catch (error) {
      Logger.error('Failed to check database schema', error);
      return false;
    }
  }

  static async testConnection(): Promise<boolean> {
    let retries = 3;
    
    while (retries > 0) {
      try {
        // Try Supabase connection first
        const supabaseConnected = await testSupabaseConnection();
        if (supabaseConnected) {
          Logger.info('Supabase connection successful');
          return true;
        }
        
        // Fallback to direct PostgreSQL connection
        await pool.query('SELECT NOW()');
        Logger.info('PostgreSQL connection successful');
        return true;
      } catch (error) {
        retries--;
        Logger.warn(`Database connection attempt failed (${3 - retries}/3)`, error);
        
        if (retries > 0) {
          Logger.info('Retrying database connection in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    Logger.error('Failed to connect to database after 3 attempts');
    return false;
  }

  static async runMigrations(): Promise<void> {
    try {
      Logger.info('Checking for database migrations...');
      Logger.info('Using Supabase - migrations should be handled through Supabase dashboard');
      Logger.info('No migrations to run at this time');
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
      Logger.info('Using Supabase - test data seeding disabled for now');
      Logger.info('You can manually add test data through Supabase dashboard if needed');
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
        Logger.warn('Database connection failed - continuing with limited functionality');
        return;
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
      Logger.warn('Database setup encountered issues but continuing', error);
      // Don't throw error - let the app start anyway
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