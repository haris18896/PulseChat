import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';

import { OnlineStatusQueryDto } from './dto/online-status-query.dto';
import { PresenceService } from 'src/presence/presence.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('online-status')
  @ApiOperation({ summary: 'Get online status of users' })
  async getOnlineStatus(@Query() query: OnlineStatusQueryDto) {
    const userIds = query.userIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const items = await this.presenceService.getOnlineStatus(userIds);

    return { items };
  }
}
