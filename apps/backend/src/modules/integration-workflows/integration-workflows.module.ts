import { Module } from '@nestjs/common';
import { IntegrationWorkflowsController } from './integration-workflows.controller';
import { IntegrationWorkflowsService } from './integration-workflows.service';

@Module({
  controllers: [IntegrationWorkflowsController],
  providers: [IntegrationWorkflowsService],
  exports: [IntegrationWorkflowsService],
})
export class IntegrationWorkflowsModule {}
