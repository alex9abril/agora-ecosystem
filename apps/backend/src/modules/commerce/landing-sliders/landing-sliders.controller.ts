import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { LandingSlidersService } from './landing-sliders.service';
import { SliderImagesService } from './slider-images.service';
import { CreateLandingSliderDto } from './dto/create-landing-slider.dto';
import { UpdateLandingSliderDto } from './dto/update-landing-slider.dto';
import { ListLandingSlidersDto } from './dto/list-landing-sliders.dto';
import { SupabaseAuthGuard } from '../../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Landing Sliders')
@Controller('landing-sliders')
export class LandingSlidersController {
  constructor(
    private readonly landingSlidersService: LandingSlidersService,
    private readonly sliderImagesService: SliderImagesService,
  ) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un nuevo slider' })
  @ApiResponse({ status: 201, description: 'Slider creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateLandingSliderDto,
  ) {
    return this.landingSlidersService.create(userId, createDto);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar sliders con filtros' })
  @ApiResponse({ status: 200, description: 'Sliders obtenidos exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: ListLandingSlidersDto,
  ) {
    return this.landingSlidersService.findAll(userId, query);
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Obtener sliders activos para un contexto (público)' })
  @ApiQuery({ name: 'business_group_id', required: false, type: String })
  @ApiQuery({ name: 'business_id', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Sliders obtenidos exitosamente' })
  async getActiveSliders(
    @Query('business_group_id') businessGroupId?: string,
    @Query('business_id') businessId?: string,
  ) {
    return this.landingSlidersService.getActiveSlidersByContext(
      businessGroupId,
      businessId,
    );
  }

  @Get(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener un slider por ID' })
  @ApiParam({ name: 'id', description: 'ID del slider' })
  @ApiResponse({ status: 200, description: 'Slider obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Slider no encontrado' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.landingSlidersService.findOne(userId, id);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un slider' })
  @ApiParam({ name: 'id', description: 'ID del slider' })
  @ApiResponse({ status: 200, description: 'Slider actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Slider no encontrado' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateLandingSliderDto,
  ) {
    return this.landingSlidersService.update(userId, id, updateDto);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un slider' })
  @ApiParam({ name: 'id', description: 'ID del slider' })
  @ApiResponse({ status: 204, description: 'Slider eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Slider no encontrado' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.landingSlidersService.remove(userId, id);
  }

  @Post('upload-image/group/:id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen de slider para un grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo empresarial' })
  @ApiResponse({ status: 201, description: 'Imagen subida exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async uploadGroupImage(
    @Param('id') groupId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.sliderImagesService.uploadImage('group', groupId, file);
  }

  @Post('upload-image/branch/:id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen de slider para una sucursal' })
  @ApiParam({ name: 'id', description: 'ID de la sucursal' })
  @ApiResponse({ status: 201, description: 'Imagen subida exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async uploadBranchImage(
    @Param('id') branchId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.sliderImagesService.uploadImage('branch', branchId, file);
  }
}

