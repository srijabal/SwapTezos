import crypto from 'crypto';

export class CryptoUtils {
  static generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static createHash(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  static verifySecret(secret: string, hash: string): boolean {
    const computedHash = this.createHash(secret);
    return computedHash === hash;
  }

  static generateOrderId(): string {
    return crypto.randomUUID();
  }

  static createOrderHash(params: {
    makerAddress: string;
    sourceChain: string;
    destChain: string;
    sourceToken: string;
    destToken: string;
    sourceAmount: string;
    destAmount: string;
    secretHash: string;
    timelock: number;
  }): string {
    const data = JSON.stringify(params);
    return crypto.createHash('sha256').update(data).digest('hex');
  }
} 