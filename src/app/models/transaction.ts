export type TransactionStatus = 'CLEAN' | 'SUSPICIOUS' | 'BLOCKED' | 'APPROVED_BY_ANALYST';


export interface Transaction {
  id: string;
  timestamp: Date;
  userId: string;
  amount: number;
  currency: string;
  merchant: string;
  country: string;
  ipAddress: string;
  riskScore: number; 
  triggeredRules: string[];
  status: TransactionStatus;
}
