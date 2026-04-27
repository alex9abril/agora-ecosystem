import { Module } from '@nestjs/common';
import { IntegrationWorkflowsController } from './integration-workflows.controller';
import { IntegrationWorkflowsService } from './integration-workflows.service';
import { IntegrationWorkflowsScheduler } from './integration-workflows.scheduler';

@Module({
  controllers: [IntegrationWorkflowsController],
  providers: [IntegrationWorkflowsService, IntegrationWorkflowsScheduler],
  exports: [IntegrationWorkflowsService],
})
export class IntegrationWorkflowsModule {}
