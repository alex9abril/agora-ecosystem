/**
 * Servicio para manejar el wallet (monedero electrónico)
 */

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
  transaction_type: 'credit' | 'debit' | 'refund' | 'payment' | 'adjustment';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  balance_before: number;
  balance_after: number;
  description?: string;
  reason?: string;
  order_id?: string;
  order_item_id?: string;
  created_at: string;
  created_by_role?: string;
}

export interface WalletTransactionsResponse {
  data: WalletTransaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CanUseWalletResponse {
  can_use: boolean;
  balance: number;
  required_amount: number;
  sufficient: boolean;
}

export const walletService = {
  /**
   * Obtener saldo actual del wallet
   */
  async getBalance(): Promise<Wallet> {
    return apiRequest<Wallet>('/wallet/balance', {
      method: 'GET',
    });
  },

  /**
   * Verificar si el usuario puede usar el wallet para un monto específico
   */
  async canUseWallet(amount: number): Promise<CanUseWalletResponse> {
    return apiRequest<CanUseWalletResponse>(`/wallet/can-use?amount=${amount}`, {
      method: 'GET',
    });
  },

  /**
   * Obtener historial de transacciones
   */
  async getTransactions(filters?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<WalletTransactionsResponse> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    return apiRequest<WalletTransactionsResponse>(`/wallet/transactions${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
};

