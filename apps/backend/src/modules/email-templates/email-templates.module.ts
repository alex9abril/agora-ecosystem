import { Module } from '@nestjs/common';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplateLogoService } from './email-template-logo.service';

@Module({
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService, EmailTemplateLogoService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}

