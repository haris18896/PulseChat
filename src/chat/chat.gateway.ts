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

// -- Types & Dtos
import { JwtPayload } from 'src/auth/types/auth.type';
import { SendMessageDto } from './dto/send-message.dto';
import { JoinConversationDto } from './dto/join-conversation.dto';
import type { AuthenticatedSocket } from './types/authenticated-user.type';
import { validateSocketPayload } from './utils/validate-socket-payload.utils';

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
    const dto = await validateSocketPayload(JoinConversationDto, body);

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
      event: 'conversation_Joined',
      data: {
        conversationId: dto.conversationId,
        room,
        joined: true,
      },
    };
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
      event: 'message_Sent',
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
}
