import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PresenceModule } from 'src/presence/presence.module';

@Module({
  providers: [UsersService],
  exports: [UsersService],
  imports: [PresenceModule],
  controllers: [UsersController],
})
export class UsersModule {}
