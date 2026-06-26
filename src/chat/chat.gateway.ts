// Third Party Modules
import {
  MessageBody,
  ConnectedSocket,
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

// -- Utils
import { socketError } from './utils/socket-erro.utils';

// -- Services
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { PresenceService } from 'src/presence/presence.service';
import { MessagesService } from 'src/messages/messages.service';
import { ConversationsService } from 'src/conversations/conversations.service';

// -- Types
import { JwtPayload } from 'src/auth/types/auth.type';
import type { AuthenticatedSocket } from './types/authenticated-user.type';
import { validateSocketPayload } from './utils/validate-socket-payload.utils';

// -- Dtos
import {
  EditMessageDto,
  MessageReadDto,
  DeleteMessageDto,
  MessageDeliveredDto,
} from './dto/message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JoinConversationDto } from './dto/join-conversation.dto';
import {
  GroupParticipantSocketDto,
  LeaveConversationSocketDto,
  updateGroupTitleSockerDto,
} from './dto/update-group.dto';

// This creates a socket.io namespace for the /chat
@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly presenceService: PresenceService,
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
  ) {}

  private extractTokennFromHandshake(
    client: AuthenticatedSocket,
  ): string | undefined {
    const token = client.handshake.auth.token;

    return typeof token === 'string' ? token : undefined;
  }

  private async validateConversation(clientId: string, conversationId: string) {
    const isParticipant = await this.conversationsService.isUserParticipant(
      clientId,
      conversationId,
    );

    if (!isParticipant) {
      throw socketError(
        'You are not a participant of this conversation',
        'FORBIDDEN',
      );
    }

    return true;
  }

  private async emitPresenceToUserConversation(
    userId: string,
    event: 'user_online' | 'user_offline',
    payload: unknown,
  ) {
    const conversationIds =
      await this.conversationsService.getConversationIdsForUser(userId);

    conversationIds.forEach((conversationId) => {
      const room = `conversation-${conversationId}`;
      this.server.to(room).emit(event, payload); // emit to only those users who are in the conversation room
    });
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokennFromHandshake(client);

      if (!token) {
        throw socketError(
          'Invalid or missing authentication token',
          'UNAUTHORIZED',
        );
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw socketError('User not found', 'UNAUTHORIZED');
      }

      client.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      const socketCount = await this.presenceService.getSocket(
        client.user.id,
        client.id,
      );

      if (socketCount === 1) {
        await this.emitPresenceToUserConversation(
          client.user.id,
          'user_online',
          {
            user: client.user,
            timestamp: new Date().toISOString(),
          },
        );
      }

      client.emit('authenticated', {
        message: 'Authenticated successfully',
        user: client.user,
      });
    } catch {
      client.emit('unauthorized', {
        message: 'Invalid or missing authentication token',
      });

      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.user) {
      return;
    }

    const remainingSockets = await this.presenceService.removeSocket(
      client.user.id,
      client.id,
    );

    if (remainingSockets === 0) {
      await this.emitPresenceToUserConversation(
        client.user.id,
        'user_offline',
        {
          user: client.user,
          timestamp: new Date().toISOString(),
        },
      );
    }

    console.log(
      'Socket disconnected: ',
      client.id,
      'user : ',
      client.user.email,
    );
  }

  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { message: string },
  ) {
    if (!client.user) {
      return { event: 'error', data: { message: 'Not Authenticated yet' } };
    }
    return {
      event: 'pong',
      data: {
        socketId: client.id,
        user: client.user,
        message: body.message,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @SubscribeMessage('join_conversation') // server listens to this event
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket, // this is the socket instance
    @MessageBody() body: JoinConversationDto, // this is the data sent by the client
  ) {
    console.log('==============================');
    console.log('JOIN EVENT RECEIVED');
    console.log('Client:', client.id);
    console.log('User:', client.user);
    console.log('Body:', body);
    console.log('==============================');

    try {
      const dto = await validateSocketPayload(JoinConversationDto, body);
      console.log('DTO validated:', dto);

      if (!client.user) {
        throw socketError('Not Authenticated yet', 'UNAUTHORIZED');
      }

      const isParticipant = await this.conversationsService.isUserParticipant(
        client.user.id,
        dto.conversationId,
      );

      if (!isParticipant) {
        throw socketError(
          'You are not a participant of this conversation',
          'FORBIDDEN',
        );
      }

      const room = `conversation-${dto.conversationId}`;

      await client.join(room);

      return {
        event: 'conversation_joined',
        data: {
          conversationId: dto.conversationId,
          room,
          joined: true,
        },
      };
    } catch (e) {
      console.error('Validation failed:', e);
      throw e;
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: SendMessageDto,
  ) {
    const dto = await validateSocketPayload(SendMessageDto, body);
    if (!client.user) {
      throw socketError('Not Authenticated yet', 'UNAUTHORIZED');
    }

    // reuse the REST logic for creating the message, rather than duplicating the logic
    const message = await this.messagesService.createMessage(client.user.id, {
      conversationId: dto.conversationId,
      content: dto.content,
    });

    const room = `conversation-${dto.conversationId}`;

    this.server.to(room).emit('new_message', message);

    return {
      event: 'message_sent',
      data: message,
    };
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: JoinConversationDto,
  ) {
    const dto = await validateSocketPayload(JoinConversationDto, body);
    if (!client.user) {
      throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
    }

    await this.validateConversation(client.user.id, dto.conversationId);

    const room = `conversation-${dto.conversationId}`;

    // This sends the event to everyone in the room except the sender.
    client.to(room).emit('user_typing_start', {
      conversationId: dto.conversationId,
      userId: client.user.id,
      timestamp: new Date().toISOString(),
    });

    return {
      event: 'typing_start_sent',
      data: {
        conversationId: dto.conversationId,
      },
    };
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: JoinConversationDto,
  ) {
    const dto = await validateSocketPayload(JoinConversationDto, body);
    if (!client.user) {
      throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
    }

    await this.validateConversation(client.user.id, dto.conversationId);

    const room = `conversation-${dto.conversationId}`;

    // This sends the event to everyone in the room except the sender.
    client.to(room).emit('user_typing_stop', {
      conversationId: dto.conversationId,
      userId: client.user.id,
      timestamp: new Date().toISOString(),
    });

    return {
      event: 'typing_stop_sent',
      data: {
        conversationId: dto.conversationId,
      },
    };
  }

  @SubscribeMessage('message_delivered')
  async handleMessageDelivered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: MessageDeliveredDto,
  ) {
    const dto = await validateSocketPayload(MessageDeliveredDto, body);

    if (!client.user) {
      throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
    }

    const message = await this.messagesService.markMessageDelivered(
      client.user.id,
      dto.conversationId,
      dto.messageId,
    );

    const room = `conversation-${dto.conversationId}`;

    this.server.to(room).emit('message_delivered', {
      conversationId: dto.conversationId,
      messageId: dto.messageId,
      timestamp: new Date().toISOString(),
      status: message.status,
      deliveredBy: client.user.id,
    });

    return {
      event: 'message_delivered_ack',
      data: {
        conversationId: dto.conversationId,
        messageId: dto.messageId,
        status: message.status,
      },
    };
  }

  @SubscribeMessage('messages_read')
  async handleMessagesRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: MessageReadDto,
  ) {
    const dto = await validateSocketPayload(MessageReadDto, body);

    if (!client.user) {
      throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
    }

    const result = await this.messagesService.markConversationMessagesRead(
      client.user.id,
      dto.conversationId,
    );

    const room = `conversation-${dto.conversationId}`;

    this.server.to(room).emit('messages_read', {
      conversationId: dto.conversationId,
      readBy: client.user.id,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
    });

    return {
      event: 'messages_read_ack',
      data: result,
    };
  }

  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: EditMessageDto,
  ) {
    const dto = await validateSocketPayload(EditMessageDto, body);

    if (!client.user) {
      throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
    }

    const updatedMessage = await this.messagesService.updateMessage(
      client.user.id,
      dto.messageId,
      {
        content: dto.content,
      },
    );

    const room = `conversation-${updatedMessage.conversationId}`;

    this.server.to(room).emit('message_edited', {
      message: updatedMessage,
      editedBy: client.user.id,
      timestamp: new Date().toISOString(),
    });

    return {
      event: 'message_edited_ack',
      data: updatedMessage,
    };
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: DeleteMessageDto,
  ) {
    const dto = await validateSocketPayload(DeleteMessageDto, body);

    if (!client.user) {
      throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
    }

    const deletedMessage = await this.messagesService.deleteMessage(
      client.user.id,
      dto.messageId,
    );

    const room = `conversation-${deletedMessage.conversationId}`;

    this.server.to(room).emit('message_deleted', {
      message: deletedMessage,
      deletedBy: client.user.id,
      timestamp: new Date().toISOString(),
    });

    return {
      event: 'message_deleted_ack',
      data: deletedMessage,
    };
  }

  @SubscribeMessage('update_group_title')
  async handleUpdateGroupTitle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: updateGroupTitleSockerDto,
  ) {
    const dto = await validateSocketPayload(updateGroupTitleSockerDto, body);

    if (!client.user) {
      throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
    }

    const conversation = await this.conversationsService.updateGroupTitle(
      client.user.id,
      dto.conversationId,
      dto.title,
    );

    const room = `conversation-${dto.conversationId}`;

    this.server.to(room).emit('group_title_updated', {
      conversation,
      updatedBy: client.user.id,
      timestamp: new Date().toISOString(),
    });

    return {
      event: 'group_title_updated_ack',
      data: conversation,
    };
  }

  @SubscribeMessage('add_group_participant')
  async handleAddGroupParticipant(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: GroupParticipantSocketDto,
  ) {
    const dto = await validateSocketPayload(GroupParticipantSocketDto, body);

    if (!client.user) {
      throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
    }

    const participant = await this.conversationsService.addParticipantToGroup(
      client.user.id,
      dto.conversationId,
      dto.userId,
    );

    const room = `conversation-${dto.conversationId}`;

    this.server.to(room).emit('group_participant_added', {
      conversationId: dto.conversationId,
      participant,
      addedBy: client.user.id,
      timestamp: new Date().toISOString(),
    });

    return {
      event: 'group_participant_added_ack',
      data: participant,
    };
  }

  @SubscribeMessage('remove_group_participant')
  async handleRemoveGroupParticipant(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: GroupParticipantSocketDto,
  ) {
    const dto = await validateSocketPayload(GroupParticipantSocketDto, body);

    if (!client.user) {
      throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
    }

    const result = await this.conversationsService.removeParticipantFromGroup(
      client.user.id,
      dto.conversationId,
      dto.userId,
    );

    const room = `conversation-${dto.conversationId}`;

    this.server.to(room).emit('group_participant_removed', {
      ...result,
      removedBy: client.user.id,
      timestamp: new Date().toISOString(),
    });

    return {
      event: 'group_participant_removed_ack',
      data: result,
    };
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: LeaveConversationSocketDto,
  ) {
    const dto = await validateSocketPayload(LeaveConversationSocketDto, body);

    if (!client.user) {
      throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
    }

    const result = await this.conversationsService.leaveConversation(
      client.user.id,
      dto.conversationId,
    );

    const room = `conversation-${dto.conversationId}`;

    await client.leave(room);

    this.server.to(room).emit('participant_left', {
      ...result,
      timestamp: new Date().toISOString(),
    });

    return {
      event: 'participant_left_ack',
      data: result,
    };
  }
}
