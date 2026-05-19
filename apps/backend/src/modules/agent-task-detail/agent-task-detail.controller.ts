import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ImproveTaskDetailDto } from './dto/improve-task-detail.dto';
import { TaskDetailImprovementService } from './task-detail-improvement.service';

@ApiTags('agent')
@Controller('agent/task-detail')
export class AgentTaskDetailController {
  constructor(private readonly taskDetailImprovementService: TaskDetailImprovementService) {}

  @Post('improve')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mejorar redacción del detalle de una tarea (expandir o reescribir)',
    description:
      'Usa un modelo LLM vía API compatible con OpenAI si existen TASK_DETAIL_AI_API_KEY u OPENAI_API_KEY; si no, aplica plantilla heurística. Incluye revisión automática (reglas) y bandera approved.',
  })
  @ApiResponse({ status: 200, description: 'Texto mejorado y resultado de revisión automática' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async improve(@Body() body: ImproveTaskDetailDto) {
    return this.taskDetailImprovementService.improve(body);
  }
}
