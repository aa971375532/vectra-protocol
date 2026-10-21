import { PublicKey, Transaction } from '@solana/web3.js';

export interface VectraClientOptions {
  network?: 'devnet' | 'mainnet-beta';
  merchantAddress?: string | PublicKey;
  vectraMintAddress?: string | PublicKey;
  feeBasisPoints?: number;
}

export interface FeeBreakdown {
  grossAmount: number;
  totalFee: number;
  burnAmount: number;
  treasuryAmount: number;
  netMerchantAmount: number;
  ratePercentage: string;
}

export class VectraClient {
  network: string;
  merchantAddress: PublicKey | null;
  vectraMint: PublicKey | null;
  decimals: number;
  feeBasisPoints: number;

  constructor(options?: VectraClientOptions);
  calculateFees(amountVctr: number): FeeBreakdown;
  buildPaymentTransaction(payerPublicKey: PublicKey, amountVctr: number): Promise<Transaction>;
  verifyPayment(signature: string): Promise<boolean>;
}
