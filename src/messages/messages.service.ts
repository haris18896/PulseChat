import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(currentUserId: string, dto: CreateMessageDto) {
    // check if the current user is a participant of the conversation
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: dto.conversationId,
        userId: currentUserId,
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    // for multiple database operations, we use transactions
    const message = await this.prisma.$transaction(async (tx) => {
      // create the message
      const createdMessage = await tx.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId: currentUserId,
          content: dto.content,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      // update the conversation with the last message at
      await tx.conversation.update({
        where: {
          id: dto.conversationId,
        },
        data: {
          lastMessageAt: createdMessage.createdAt,
        },
      });

      return createdMessage;
    });

    return message;
  }

  async getMessagesByConversation(
    currentUserId: string,
    conversationId: string,
    query: GetMessagesQueryDto,
  ) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: currentUserId,
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    const limit = query.limit || 20;

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      ...(query.cursor
        ? {
            cursor: {
              id: query.cursor,
            },
            skip: 1,
          }
        : {}),
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    const hasNextPage = messages.length > limit;
    const items = hasNextPage ? messages.slice(0, limit) : messages;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return {
      items: items?.reverse(),
      pageInfo: {
        nextCursor,
        hasNextPage,
      },
    };
  }
}
