import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/types/auth.type';
import { Throttle } from '@nestjs/throttler';
import {
  AddParticipantDto,
  UpdateConversationTitleDto,
} from './dto/udpate-conversation.dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiCreatedResponse({
    description: 'Conversation created successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.createConversation(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my conversations' })
  async getMyConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.conversationsService.getMyConversations(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details' })
  async getConversationById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return await this.conversationsService.getConversationById(
      user.id,
      conversationId,
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch(':id/title')
  @ApiOperation({ summary: 'Update group conversation title' })
  @ApiOkResponse({
    description: 'Conversation title updated successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async updateConversationTitle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() dto: UpdateConversationTitleDto,
  ) {
    if (!dto.title?.trim()) {
      throw new BadRequestException('Title cannot be empty');
    }

    return await this.conversationsService.updateConversationTitle(
      user.id,
      conversationId,
      dto.title,
    );
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Post(':id/participants')
  @ApiOperation({ summary: 'Add participant to group conversation' })
  @ApiOkResponse({
    description: 'Participant added successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async addParticipantToGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() dto: AddParticipantDto,
  ) {
    return await this.conversationsService.addParticipantToGroup(
      user.id,
      conversationId,
      dto.userId,
    );
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Delete(':id/participants/:userId')
  @ApiOperation({ summary: 'Remove participant from group conversation' })
  @ApiOkResponse({
    description: 'Participant removed successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async removeParticipantFromGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Param('userId') userId: string,
  ) {
    return await this.conversationsService.removeParticipantFromGroup(
      user.id,
      conversationId,
      userId,
    );
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a group conversation' })
  @ApiOkResponse({
    description: 'Conversation left successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  async leaveConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return await this.conversationsService.leaveConversation(
      user.id,
      conversationId,
    );
  }
}
