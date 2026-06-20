import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/types/auth.type';

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
  createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.createConversation(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my conversations' })
  getMyConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.conversationsService.getMyConversations(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details' })
  getConversationById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return this.conversationsService.getConversationById(
      user.id,
      conversationId,
    );
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateConversationDto: UpdateConversationDto) {
  //   return this.conversationsService.update(+id, updateConversationDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.conversationsService.remove(+id);
  // }
}
