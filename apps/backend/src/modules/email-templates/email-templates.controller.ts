import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplateLogoService } from './email-template-logo.service';
import { CreateEmailTemplateDto, EmailTemplateLevel } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { ListEmailTemplatesDto } from './dto/list-email-templates.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@ApiTags('Email Templates')
@ApiBearerAuth()
@Controller('email-templates')
@UseGuards(SupabaseAuthGuard)
export class EmailTemplatesController {
  constructor(
    private readonly emailTemplatesService: EmailTemplatesService,
    private readonly emailTemplateLogoService: EmailTemplateLogoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar templates de correo según el nivel' })
  @ApiQuery({ name: 'level', enum: EmailTemplateLevel, required: true, description: 'Nivel del template (global, group, business)' })
  @ApiQuery({ name: 'business_group_id', required: false, description: 'ID del grupo empresarial (requerido para nivel group)' })
  @ApiQuery({ name: 'business_id', required: false, description: 'ID de la sucursal (requerido para nivel business)' })
  @ApiResponse({ status: 200, description: 'Lista de templates obtenida exitosamente' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 503, description: 'Servicio no disponible' })
  async list(@Query() query: ListEmailTemplatesDto) {
    if (!query.level) {
      throw new BadRequestException('level es requerido');
    }

    const templates = await this.emailTemplatesService.list(query.level, query);
    return { data: templates };
  }

  @Get('by-trigger')
  @ApiOperation({ summary: 'Obtener template por trigger_type' })
  @ApiQuery({ name: 'trigger_type', required: true, description: 'Tipo de trigger (user_registration, order_confirmation, order_status_change)' })
  @ApiQuery({ name: 'level', enum: EmailTemplateLevel, required: true, description: 'Nivel del template' })
  @ApiQuery({ name: 'business_group_id', required: false, description: 'ID del grupo empresarial (requerido para nivel group)' })
  @ApiQuery({ name: 'business_id', required: false, description: 'ID de la sucursal (requerido para nivel business)' })
  @ApiResponse({ status: 200, description: 'Template obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Template no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getByTrigger(
    @Query('trigger_type') triggerType: string,
    @Query('level') level: EmailTemplateLevel,
    @Query('business_group_id') businessGroupId?: string,
    @Query('business_id') businessId?: string,
  ) {
    const template = await this.emailTemplatesService.findByTrigger(
      triggerType as any,
      level,
      { business_group_id: businessGroupId, business_id: businessId }
    );

    if (!template) {
      return { data: null };
    }

    return { data: template };
  }

  @Get('resolved')
  @ApiOperation({ summary: 'Obtener template resuelto usando la jerarquía (business -> group -> global)' })
  @ApiQuery({ name: 'trigger_type', required: true, description: 'Tipo de trigger' })
  @ApiQuery({ name: 'business_id', required: false, description: 'ID de la sucursal' })
  @ApiQuery({ name: 'business_group_id', required: false, description: 'ID del grupo empresarial' })
  @ApiResponse({ status: 200, description: 'Template resuelto obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Template no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getResolved(
    @Query('trigger_type') triggerType: string,
    @Query('business_id') businessId?: string,
    @Query('business_group_id') businessGroupId?: string,
  ) {
    const template = await this.emailTemplatesService.getResolvedTemplate(
      triggerType as any,
      businessId,
      businessGroupId
    );
    return { data: template };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un template por ID' })
  @ApiParam({ name: 'id', description: 'ID del template (UUID)' })
  @ApiQuery({ name: 'level', enum: EmailTemplateLevel, required: true, description: 'Nivel del template' })
  @ApiResponse({ status: 200, description: 'Template obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Template no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findOne(
    @Param('id') id: string,
    @Query('level') level: EmailTemplateLevel,
  ) {
    const template = await this.emailTemplatesService.findOne(id, level);
    return { data: template };
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo template' })
  @ApiQuery({ name: 'level', enum: EmailTemplateLevel, required: true, description: 'Nivel del template' })
  @ApiResponse({ status: 201, description: 'Template creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Query('level') level: EmailTemplateLevel,
    @Body() createDto: CreateEmailTemplateDto,
  ) {
    const template = await this.emailTemplatesService.create(level, createDto);
    return { data: template };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un template existente' })
  @ApiParam({ name: 'id', description: 'ID del template (UUID)' })
  @ApiQuery({ name: 'level', enum: EmailTemplateLevel, required: true, description: 'Nivel del template' })
  @ApiResponse({ status: 200, description: 'Template actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Template no encontrado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async update(
    @Param('id') id: string,
    @Query('level') level: EmailTemplateLevel,
    @Body() updateDto: UpdateEmailTemplateDto,
  ) {
    const template = await this.emailTemplatesService.update(id, level, updateDto);
    return { data: template };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un template (solo templates personalizados, no globales)' })
  @ApiParam({ name: 'id', description: 'ID del template (UUID)' })
  @ApiQuery({ name: 'level', enum: EmailTemplateLevel, required: true, description: 'Nivel del template' })
  @ApiResponse({ status: 200, description: 'Template eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Template no encontrado' })
  @ApiResponse({ status: 403, description: 'No se pueden eliminar templates globales' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @Query('level') level: EmailTemplateLevel,
  ) {
    await this.emailTemplatesService.remove(id, level);
    return { message: 'Template eliminado exitosamente' };
  }

  @Post(':id/upload-logo')
  @ApiOperation({ summary: 'Subir logo para un template' })
  @ApiParam({ name: 'id', description: 'ID del template (UUID)' })
  @ApiQuery({ name: 'level', enum: EmailTemplateLevel, required: true, description: 'Nivel del template' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Logo subido exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadLogo(
    @Param('id') id: string,
    @Query('level') level: EmailTemplateLevel,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const levelMap: Record<EmailTemplateLevel, 'global' | 'group' | 'business'> = {
      [EmailTemplateLevel.GLOBAL]: 'global',
      [EmailTemplateLevel.GROUP]: 'group',
      [EmailTemplateLevel.BUSINESS]: 'business',
    };

    const uploadResult = await this.emailTemplateLogoService.uploadLogo(
      levelMap[level],
      id,
      file,
    );

    // Actualizar el template con la URL del logo
    await this.emailTemplatesService.update(id, level, {
      logo_url: uploadResult.url,
    });

    return { data: uploadResult };
  }
}

