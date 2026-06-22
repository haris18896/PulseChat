import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

// -- Modules
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { PresenceModule } from 'src/presence/presence.module';
import { MessagesModule } from 'src/messages/messages.module';
import { ConversationsModule } from 'src/conversations/conversations.module';

@Module({
  providers: [ChatGateway],
  imports: [
    UsersModule,
    AuthModule,
    ConversationsModule,
    MessagesModule,
    PresenceModule,
  ],
})
export class ChatModule {}
