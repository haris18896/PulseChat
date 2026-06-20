import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
  imports: [UsersModule],
})
export class ConversationsModule {}
