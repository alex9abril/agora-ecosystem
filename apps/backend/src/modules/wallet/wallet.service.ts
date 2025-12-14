import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { dbPool } from '../../config/database.config';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  is_active: boolean;
  is_blocked: boolean;
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class WalletService {
  /**
   * Obtener wallet de un usuario
   */
  async getWallet(userId: string): Promise<Wallet> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const result = await dbPool.query(
      `SELECT * FROM commerce.user_wallets WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Crear wallet si no existe
      const insertResult = await dbPool.query(
        `INSERT INTO commerce.user_wallets (user_id, balance, is_active)
         VALUES ($1, 0.00, TRUE)
         RETURNING *`,
        [userId]
      );
      return insertResult.rows[0];
    }

    return result.rows[0];
  }

  /**
   * Obtener saldo actual del wallet
   */
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return parseFloat(wallet.balance.toString());
  }

  /**
   * Verificar si el usuario puede usar el wallet para un monto específico
   */
  async canUseWallet(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  /**
   * Acreditar saldo al wallet (Nota de crédito)
   */
  async creditWallet(
    userId: string,
    creditDto: CreditWalletDto,
    createdByUserId?: string,
    createdByRole: string = 'admin',
  ): Promise<WalletTransaction> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    if (creditDto.amount <= 0) {
      throw new BadRequestException('El monto a acreditar debe ser mayor a 0');
    }

    try {
      console.log('💰 [WALLET SERVICE] Iniciando acreditación:', {
        userId,
        amount: creditDto.amount,
        reason: creditDto.reason,
        order_id: creditDto.order_id,
        order_item_id: creditDto.order_item_id,
        createdByUserId,
        createdByRole,
      });

      const result = await dbPool.query(
        `SELECT commerce.credit_wallet(
          $1::UUID,
          $2::DECIMAL,
          $3::TEXT,
          $4::TEXT,
          $5::UUID,
          $6::UUID,
          $7::UUID,
          $8::user_role
        )`,
        [
          userId,
          creditDto.amount,
          creditDto.reason || null,
          creditDto.description || null,
          creditDto.order_id || null,
          creditDto.order_item_id || null,
          createdByUserId || null,
          createdByRole,
        ]
      );

      console.log('💰 [WALLET SERVICE] Resultado de la función SQL:', {
        hasResult: !!result.rows[0],
        resultKeys: result.rows[0] ? Object.keys(result.rows[0]) : [],
        rawResult: result.rows[0],
      });

      // La función retorna un registro completo de wallet_transactions
      // PostgreSQL puede retornar el tipo compuesto de diferentes formas dependiendo del driver
      const rawResult = result.rows[0];
      let transaction: WalletTransaction;

      if (!rawResult) {
        throw new ServiceUnavailableException('La función credit_wallet no retornó ningún resultado');
      }

      // Intentar diferentes formas de extraer el resultado
      if (rawResult.credit_wallet) {
        // Forma 1: Viene como objeto anidado con el nombre de la función
        const walletResult = rawResult.credit_wallet;
        if (typeof walletResult === 'object' && walletResult !== null) {
          // Si es un objeto con campos, usarlo directamente
          if ('id' in walletResult) {
            transaction = walletResult as WalletTransaction;
          } else {
            // Si es un array o string, puede ser que el driver lo serialice de otra forma
            console.error('❌ [WALLET SERVICE] Formato inesperado de credit_wallet:', typeof walletResult, walletResult);
            throw new ServiceUnavailableException('Formato inesperado del resultado de credit_wallet');
          }
        } else {
          console.error('❌ [WALLET SERVICE] credit_wallet no es un objeto:', typeof walletResult, walletResult);
          throw new ServiceUnavailableException('El resultado de credit_wallet no es un objeto válido');
        }
      } else if (rawResult.id) {
        // Forma 2: Viene como campos directos (algunos drivers hacen esto)
        transaction = rawResult as WalletTransaction;
      } else {
        // Forma 3: Puede venir con otro nombre o estructura
        console.error('❌ [WALLET SERVICE] No se pudo extraer la transacción del resultado:', rawResult);
        throw new ServiceUnavailableException('No se pudo extraer la transacción del resultado de credit_wallet');
      }
      
      if (!transaction || !transaction.id) {
        console.error('❌ [WALLET SERVICE] Transacción inválida:', transaction);
        throw new ServiceUnavailableException('La función credit_wallet no retornó una transacción válida');
      }

      console.log('✅ [WALLET SERVICE] Transacción creada exitosamente:', {
        transaction_id: transaction.id,
        amount: transaction.amount,
        balance_after: transaction.balance_after,
      });

      return transaction;
    } catch (error: any) {
      console.error('❌ [WALLET SERVICE] Error acreditando wallet:', error);
      console.error('❌ [WALLET SERVICE] Error completo:', JSON.stringify(error, null, 2));
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al acreditar wallet: ${error.message}`);
    }
  }

  /**
   * Debitar saldo del wallet (Pago)
   */
  async debitWallet(
    userId: string,
    debitDto: DebitWalletDto,
    createdByUserId?: string,
    createdByRole: string = 'client',
  ): Promise<WalletTransaction> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    if (debitDto.amount <= 0) {
      throw new BadRequestException('El monto a debitar debe ser mayor a 0');
    }

    // Verificar saldo suficiente
    const balance = await this.getBalance(userId);
    if (balance < debitDto.amount) {
      throw new BadRequestException(
        `Saldo insuficiente. Saldo disponible: ${balance.toFixed(2)}, Monto requerido: ${debitDto.amount.toFixed(2)}`
      );
    }

    try {
      const result = await dbPool.query(
        `SELECT commerce.debit_wallet(
          $1::UUID,
          $2::DECIMAL,
          $3::TEXT,
          $4::TEXT,
          $5::UUID,
          $6::UUID,
          $7::user_role
        )`,
        [
          userId,
          debitDto.amount,
          debitDto.reason || null,
          debitDto.description || null,
          debitDto.order_id || null,
          createdByUserId || null,
          createdByRole,
        ]
      );

      // La función retorna un registro completo de wallet_transactions
      const transaction = result.rows[0].debit_wallet;
      return transaction;
    } catch (error: any) {
      console.error('Error debitando wallet:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException(`Error al debitar wallet: ${error.message}`);
    }
  }

  /**
   * Obtener historial de transacciones
   */
  async getTransactions(
    userId: string,
    filters: ListTransactionsDto,
  ): Promise<{ data: WalletTransaction[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    if (!dbPool) {
      throw new ServiceUnavailableException('Conexión a base de datos no configurada');
    }

    const { page = 1, limit = 20, type, status } = filters;
    const offset = (page - 1) * limit;

    // Obtener wallet del usuario
    const wallet = await this.getWallet(userId);

    // Construir query con filtros
    let whereConditions: string[] = ['wt.wallet_id = $1'];
    let queryParams: any[] = [wallet.id];
    let paramIndex = 2;

    if (type) {
      whereConditions.push(`wt.transaction_type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`wt.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM commerce.wallet_transactions wt
      ${whereClause}
    `;
    const countResult = await dbPool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Query principal - Incluir business_id del pedido relacionado
    const query = `
      SELECT 
        wt.*,
        up.first_name || ' ' || up.last_name as created_by_name,
        o.business_id
      FROM commerce.wallet_transactions wt
      LEFT JOIN core.user_profiles up ON wt.created_by_user_id = up.id
      LEFT JOIN orders.orders o ON wt.order_id = o.id
      ${whereClause}
      ORDER BY wt.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const result = await dbPool.query(query, queryParams);

    return {
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

