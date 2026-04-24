import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { User } from '@supabase/supabase-js';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IntegrationWorkflowsService } from './integration-workflows.service';
import { CreateConnectorDto } from './dto/create-connector.dto';
import { TestMssqlOverrideDto, TestMssqlPayloadDto } from './dto/test-mssql-connection.dto';
import { UpdateConnectorDto } from './dto/update-connector.dto';
import { MssqlPreviewQueryDto } from './dto/mssql-preview-query.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { RunWorkflowDto } from './dto/run-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { PreviewWorkflowCodeDto } from './dto/preview-workflow-code.dto';

@ApiTags('integration-workflows')
@Controller('businesses/:businessId/integration')
@UseGuards(SupabaseAuthGuard)
export class IntegrationWorkflowsController {
  constructor(private readonly integrationWorkflowsService: IntegrationWorkflowsService) {}

  @Get('connector-types')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'businessId', description: 'ID de la sucursal (core.businesses)' })
  @ApiOperation({ summary: 'Listar catálogo de tipos de conector' })
  listConnectorTypes(@CurrentUser() user: User, @Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.integrationWorkflowsService.listConnectorTypes(user.id, businessId);
  }

  @Get('connectors')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'businessId' })
  @ApiOperation({ summary: 'Listar conectores de la sucursal' })
  listConnectors(@CurrentUser() user: User, @Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.integrationWorkflowsService.listConnectors(user.id, businessId);
  }

  @Get('connectors/:connectorId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Detalle conector' })
  getConnector(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('connectorId', ParseUUIDPipe) connectorId: string,
  ) {
    return this.integrationWorkflowsService.getConnector(user.id, businessId, connectorId);
  }

  @Post('connectors')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear conector (MSSQL en v1)' })
  createConnector(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateConnectorDto,
  ) {
    return this.integrationWorkflowsService.createConnector(user.id, businessId, dto);
  }

  @Post('connectors/mssql/test')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Probar conexión MSSQL (antes de guardar o credenciales nuevas)' })
  testMssqlPayload(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: TestMssqlPayloadDto,
  ) {
    return this.integrationWorkflowsService.testMssqlWithPayload(user.id, businessId, dto);
  }

  @Post('connectors/:connectorId/mssql/test')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Probar conexión de un conector (opcional: sobrescribir campos del formulario)' })
  testMssqlForConnector(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('connectorId', ParseUUIDPipe) connectorId: string,
    @Body() dto: TestMssqlOverrideDto,
  ) {
    return this.integrationWorkflowsService.testMssqlForConnector(user.id, businessId, connectorId, dto ?? {});
  }

  @Post('connectors/:connectorId/mssql/preview')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vista previa: ejecutar consulta SQL con el conector' })
  previewMssqlQuery(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('connectorId', ParseUUIDPipe) connectorId: string,
    @Body() dto: MssqlPreviewQueryDto,
  ) {
    return this.integrationWorkflowsService.previewMssqlQuery(user.id, businessId, connectorId, dto.query);
  }

  @Patch('connectors/:connectorId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar conector' })
  updateConnector(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('connectorId', ParseUUIDPipe) connectorId: string,
    @Body() dto: UpdateConnectorDto,
  ) {
    return this.integrationWorkflowsService.updateConnector(user.id, businessId, connectorId, dto);
  }

  @Delete('connectors/:connectorId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar conector' })
  deleteConnector(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('connectorId', ParseUUIDPipe) connectorId: string,
  ) {
    return this.integrationWorkflowsService.deleteConnector(user.id, businessId, connectorId);
  }

  @Get('workflows')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar flujos de automatización' })
  listWorkflows(@CurrentUser() user: User, @Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.integrationWorkflowsService.listWorkflows(user.id, businessId);
  }

  @Get('workflows/:workflowId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener un flujo' })
  getWorkflow(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
  ) {
    return this.integrationWorkflowsService.getWorkflow(user.id, businessId, workflowId);
  }

  @Post('workflows')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear flujo' })
  createWorkflow(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.integrationWorkflowsService.createWorkflow(user.id, businessId, dto);
  }

  @Post('workflows/preview-code')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vista previa: ejecutar JavaScript del nodo Code (misma API $input que al correr el flujo)' })
  previewWorkflowCode(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: PreviewWorkflowCodeDto,
  ) {
    return this.integrationWorkflowsService.previewWorkflowCode(user.id, businessId, dto);
  }

  @Patch('workflows/:workflowId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar flujo' })
  updateWorkflow(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.integrationWorkflowsService.updateWorkflow(user.id, businessId, workflowId, dto);
  }

  @Delete('workflows/:workflowId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar flujo' })
  deleteWorkflow(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
  ) {
    return this.integrationWorkflowsService.deleteWorkflow(user.id, businessId, workflowId);
  }

  @Get('workflows/:workflowId/runs')
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'Historial de ejecuciones' })
  listRuns(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Query('limit') limitParam?: string,
  ) {
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20)) : 20;
    return this.integrationWorkflowsService.listWorkflowRuns(user.id, businessId, workflowId, limit);
  }

  @Get('data-bridge/tables')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar tablas data_bridge permitidas para el nodo Guardar en data bridge' })
  listDataBridgeWriteTables(@CurrentUser() user: User, @Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.integrationWorkflowsService.listDataBridgeWriteTables(user.id, businessId);
  }

  @Get('data-bridge/tables/:tableName/columns')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Columnas de una tabla data_bridge permitida (mapeo de campos)' })
  getDataBridgeWriteTableColumns(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('tableName') tableName: string,
  ) {
    return this.integrationWorkflowsService.getDataBridgeWriteTableColumns(user.id, businessId, tableName);
  }

  @Post('workflows/:workflowId/run')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Ejecutar flujo manualmente (opcional: definition del editor sin guardar)' })
  runWorkflow(
    @CurrentUser() user: User,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Body() body: RunWorkflowDto,
  ) {
    return this.integrationWorkflowsService.runWorkflow(user, businessId, workflowId, body);
  }
}
