import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

// -- Modules
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { ConversationsModule } from 'src/conversations/conversations.module';

@Module({
  providers: [ChatGateway],
  imports: [UsersModule, AuthModule, ConversationsModule],
})
export class ChatModule {}
