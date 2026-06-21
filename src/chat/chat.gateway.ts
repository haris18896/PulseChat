import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UsersService } from 'src/users/users.service';
import type { AuthenticatedSocket } from './types/authenticated-user.type';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from 'src/auth/types/auth.type';
import { ConversationsService } from 'src/conversations/conversations.service';
import { JoinConversationDto } from './dto/join-conversation.dto';

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
    private readonly conversationsService: ConversationsService,
  ) {}

  private extractTokennFromHandshake(
    client: AuthenticatedSocket,
  ): string | undefined {
    const token = client.handshake.auth.token;

    return typeof token === 'string' ? token : undefined;
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokennFromHandshake(client);

      if (!token) {
        throw new UnauthorizedException(
          'Invalid or missing authentication token',
        );
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      client.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      console.log('socket connected', client.id, 'user : ', client.user.email);

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

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(
      'Socket disconnected: ',
      client.id,
      'user : ',
      client.user?.email ?? 'unknown user',
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
    if (!client.user) {
      throw new UnauthorizedException('Not Authenticated yet');
    }

    const isParticipant = await this.conversationsService.isUserParticipant(
      client.user.id,
      body.conversationId,
    );

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    const room = `conversation-${body.conversationId}`;

    await client.join(room);

    return {
      event: 'conversation_Joined',
      data: {
        conversationId: body.conversationId,
        room,
        joined: true,
      },
    };
  }
}
