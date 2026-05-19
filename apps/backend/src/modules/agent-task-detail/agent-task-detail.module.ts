import { Module } from '@nestjs/common';
import { AgentTaskDetailController } from './agent-task-detail.controller';
import { TaskDetailImprovementService } from './task-detail-improvement.service';

@Module({
  controllers: [AgentTaskDetailController],
  providers: [TaskDetailImprovementService],
  exports: [TaskDetailImprovementService],
})
export class AgentTaskDetailModule {}
