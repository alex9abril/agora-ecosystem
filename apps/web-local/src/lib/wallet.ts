import { apiRequest } from './api';

export interface Wallet {
  wallet_id: string;
  user_id: string;
  balance: number;
  is_active: boolean;
  is_blocked: boolean;
  last_transaction_at?: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  transaction_type: 'credit' | 'debit' | 'refund' | 'payment' | 'adjustment';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  balance_before: number;
  balance_after: number;
  order_id?: string;
  order_item_id?: string;
  description?: string;
  reason?: string;
  created_by_user_id?: string;
  created_by_role?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditWalletData {
  amount: number;
  reason?: string;
  description?: string;
  order_id?: string;
  order_item_id?: string;
}

export interface DebitWalletData {
  amount: number;
  reason?: string;
  description?: string;
  order_id?: string;
}

export interface ListTransactionsFilters {
  page?: number;
  limit?: number;
  type?: 'credit' | 'debit' | 'refund' | 'payment' | 'adjustment';
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface TransactionsResponse {
  data: WalletTransaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const walletService = {
  /**
   * Obtener saldo actual del wallet
   */
  async getBalance(): Promise<Wallet> {
    return apiRequest<Wallet>('/wallet/balance');
  },

  /**
   * Acreditar saldo al wallet
   */
  async creditWallet(data: CreditWalletData): Promise<WalletTransaction> {
    return apiRequest<WalletTransaction>('/wallet/credit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Debitar saldo del wallet
   */
  async debitWallet(data: DebitWalletData): Promise<WalletTransaction> {
    return apiRequest<WalletTransaction>('/wallet/debit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtener historial de transacciones
   */
  async getTransactions(filters?: ListTransactionsFilters): Promise<TransactionsResponse> {
    const queryParams = new URLSearchParams();
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.status) queryParams.append('status', filters.status);

    const queryString = queryParams.toString();
    const url = `/wallet/transactions${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<TransactionsResponse>(url);
  },

  /**
   * Verificar si puede usar el wallet para un monto específico
   */
  async canUseWallet(amount: number): Promise<{ can_use: boolean; balance: number; required_amount: number; sufficient: boolean }> {
    return apiRequest(`/wallet/can-use?amount=${amount}`);
  },
};

