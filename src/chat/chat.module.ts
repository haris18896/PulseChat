import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  providers: [ChatGateway],
  imports: [UsersModule, AuthModule],
})
export class ChatModule {}
