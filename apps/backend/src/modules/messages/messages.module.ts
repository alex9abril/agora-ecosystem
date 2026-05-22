import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { BusinessUsersModule } from '../business-users/business-users.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [BusinessUsersModule, EmailModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}

