import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';
import { UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from 'src/auth/types/auth.type';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Throttle({ default: { limit: 30, ttl: 60000 } })
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

  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Get(':conversationId')
  @ApiOperation({ summary: 'Get messages by conversation ID' })
  @ApiOkResponse({
    description: 'Messages fetched successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  getMessagesByConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messagesService.getMessagesByConversation(
      user.id,
      conversationId,
      query,
    );
  }
}
