import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';
import { MessagesService } from './messages.service';
import { SendCustomEmailDto } from './dto/send-custom-email.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { ListInboxDto } from './dto/list-inbox.dto';

@ApiTags('messages')
@Controller('messages')
@UseGuards(SupabaseAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('inbox/unread-count')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bandeja de entrada (cliente): cantidad de mensajes no leídos' })
  async unreadCount(@CurrentUser() user: User, @Query() dto: ListInboxDto) {
    return this.messagesService.unreadCount(user.id, dto);
  }

  @Get('inbox')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bandeja de entrada (cliente): mensajes recibidos' })
  async inbox(@CurrentUser() user: User, @Query() dto: ListInboxDto) {
    return this.messagesService.listInbox(user.id, dto);
  }

  @Post('inbox/:id/read')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bandeja de entrada (cliente): marcar mensaje como leído' })
  @ApiParam({ name: 'id', description: 'ID del mensaje', type: String })
  async markRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.messagesService.markInboxRead(user.id, id);
  }

  @Post('email')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Enviar correo personalizado (custom_message) a un cliente' })
  @ApiResponse({ status: 201, description: 'Correo encolado/enviado' })
  async sendCustomEmail(@CurrentUser() user: User, @Body() dto: SendCustomEmailDto) {
    return this.messagesService.sendCustomEmail(user.id, dto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar mensajes (outbound) por sucursal' })
  @ApiQuery({ name: 'business_id', required: true })
  async list(@CurrentUser() user: User, @Query() dto: ListMessagesDto) {
    return this.messagesService.list(user.id, dto);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener detalle de un mensaje' })
  @ApiParam({ name: 'id', description: 'ID del mensaje', type: String })
  @ApiQuery({ name: 'business_id', required: true })
  async getById(@CurrentUser() user: User, @Param('id') id: string, @Query('business_id') businessId: string) {
    return this.messagesService.getById(user.id, businessId, id);
  }
}
