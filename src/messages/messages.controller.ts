import { Body, Controller, Post } from '@nestjs/common';
import { MessagesService } from './messages.service';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';
import { UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from 'src/auth/types/auth.type';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CreateMessageDto } from './dto/create-message.dto';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message' })
  @ApiCreatedResponse({
    description: 'Message created successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  createMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(user.id, dto);
  }
}
