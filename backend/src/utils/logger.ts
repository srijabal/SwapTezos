export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  static info(message: string, data?: any): void {
    console.log(`[${this.getTimestamp()}] INFO: ${message}`, data || '');
  }

  static error(message: string, error?: any): void {
    console.error(`[${this.getTimestamp()}] ERROR: ${message}`, error || '');
  }

  static warn(message: string, data?: any): void {
    console.warn(`[${this.getTimestamp()}] WARN: ${message}`, data || '');
  }

  static debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.getTimestamp()}] DEBUG: ${message}`, data || '');
    }
  }
} 