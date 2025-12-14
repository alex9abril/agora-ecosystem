import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
@UseGuards(SupabaseAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Obtener saldo actual del wallet' })
  @ApiResponse({ status: 200, description: 'Saldo obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getBalance(@CurrentUser() user: User) {
    const wallet = await this.walletService.getWallet(user.id);
    return {
      wallet_id: wallet.id,
      user_id: wallet.user_id,
      balance: parseFloat(wallet.balance.toString()),
      is_active: wallet.is_active,
      is_blocked: wallet.is_blocked,
      last_transaction_at: wallet.updated_at,
    };
  }

  @Post('credit')
  @ApiOperation({ summary: 'Acreditar saldo al wallet (Nota de crédito)' })
  @ApiResponse({ status: 201, description: 'Saldo acreditado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async creditWallet(
    @CurrentUser() user: User,
    @Body() creditDto: CreditWalletDto,
  ) {
    // Obtener rol del usuario desde el perfil
    let userRole = 'admin';
    try {
      const { dbPool } = await import('../../config/database.config');
      if (dbPool) {
        const userProfile = await dbPool.query(
          `SELECT role FROM core.user_profiles WHERE id = $1`,
          [user.id]
        );
        userRole = userProfile.rows[0]?.role || 'admin';
      }
    } catch (error) {
      console.warn('No se pudo obtener perfil de usuario, usando rol por defecto:', error);
    }

    const transaction = await this.walletService.creditWallet(
      user.id,
      creditDto,
      user.id,
      userRole,
    );

    return transaction;
  }

  @Post('debit')
  @ApiOperation({ summary: 'Debitar saldo del wallet (Pago)' })
  @ApiResponse({ status: 201, description: 'Saldo debitado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o saldo insuficiente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async debitWallet(
    @CurrentUser() user: User,
    @Body() debitDto: DebitWalletDto,
  ) {
    // Obtener rol del usuario desde el perfil
    let userRole = 'client';
    try {
      const { dbPool } = await import('../../config/database.config');
      if (dbPool) {
        const userProfile = await dbPool.query(
          `SELECT role FROM core.user_profiles WHERE id = $1`,
          [user.id]
        );
        userRole = userProfile.rows[0]?.role || 'client';
      }
    } catch (error) {
      console.warn('No se pudo obtener perfil de usuario, usando rol por defecto:', error);
    }

    const transaction = await this.walletService.debitWallet(
      user.id,
      debitDto,
      user.id,
      userRole,
    );

    return transaction;
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Obtener historial de transacciones del wallet' })
  @ApiResponse({ status: 200, description: 'Historial obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getTransactions(
    @CurrentUser() user: User,
    @Query() filters: ListTransactionsDto,
  ) {
    return this.walletService.getTransactions(user.id, filters);
  }

  @Get('can-use')
  @ApiOperation({ summary: 'Verificar si el usuario puede usar el wallet para un monto específico' })
  @ApiQuery({ name: 'amount', description: 'Monto a verificar', type: Number, required: true })
  @ApiResponse({ status: 200, description: 'Verificación realizada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async canUseWallet(
    @CurrentUser() user: User,
    @Query('amount') amount: string,
  ) {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('El monto debe ser un número mayor a 0');
    }

    const canUse = await this.walletService.canUseWallet(user.id, amountNum);
    const balance = await this.walletService.getBalance(user.id);

    return {
      can_use: canUse,
      balance: balance,
      required_amount: amountNum,
      sufficient: canUse,
    };
  }

  @Get('user/:userId/balance')
  @ApiOperation({ summary: 'Obtener saldo del wallet de un usuario específico (para admin)' })
  @ApiParam({ name: 'userId', description: 'ID del usuario', type: String })
  @ApiResponse({ status: 200, description: 'Saldo obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getBalanceByUserId(@Param('userId') userId: string) {
    const wallet = await this.walletService.getWallet(userId);
    return {
      wallet_id: wallet.id,
      user_id: wallet.user_id,
      balance: parseFloat(wallet.balance.toString()),
      is_active: wallet.is_active,
      is_blocked: wallet.is_blocked,
      last_transaction_at: wallet.updated_at,
    };
  }

  @Get('user/:userId/transactions')
  @ApiOperation({ summary: 'Obtener historial de transacciones del wallet de un usuario específico (para admin)' })
  @ApiParam({ name: 'userId', description: 'ID del usuario', type: String })
  @ApiResponse({ status: 200, description: 'Historial obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async getTransactionsByUserId(
    @Param('userId') userId: string,
    @Query() filters: ListTransactionsDto,
  ) {
    return this.walletService.getTransactions(userId, filters);
  }
}

