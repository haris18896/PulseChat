import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
  imports: [UsersModule],
  exports: [MessagesService],
})
export class MessagesModule {}
