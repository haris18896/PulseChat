import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureConversationParticipant(
    conversationId: string,
    userId: string,
  ) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    return true;
  }

  async createMessage(currentUserId: string, dto: CreateMessageDto) {
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException('Message content cannot be empty');
    }

    await this.ensureConversationParticipant(dto.conversationId, currentUserId);

    return this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId: currentUserId,
          content,
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
  }

  async getMessagesByConversation(
    currentUserId: string,
    conversationId: string,
    query: GetMessagesQueryDto,
  ) {
    await this.ensureConversationParticipant(conversationId, currentUserId);

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
