import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { MessageStatus } from 'generated/Prisma';
import { UpdateMessageDto } from './dto/update-message.dto';

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
          status: 'SENT',
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
          lastMessageId: createdMessage.id,
          lastMessagePreview:
            content.slice(0, 120) + (content.length > 120 ? '...' : ''),
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

  async markMessageDelievered(
    currentUserId: string,
    conversationId: string,
    messageId: string,
  ) {
    await this.ensureConversationParticipant(conversationId, currentUserId);

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
      select: {
        id: true,
        senderId: true,
        status: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId === currentUserId) {
      throw new BadRequestException(
        'Sender cannot mark own message as delivered',
      );
    }

    if (message.status === 'READ') {
      return message;
    }

    return this.prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        status: 'DELIVERED',
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
  }

  async markConversationMessagesRead(
    currentUserId: string,
    conversationId: string,
  ) {
    await this.ensureConversationParticipant(conversationId, currentUserId);

    // We update all unread/unread-delivered messages in one DB query.
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: {
          not: currentUserId, // A user cannot mark their own messages as read.
        },
      },
      data: {
        status: MessageStatus.READ, // Avoids unnecessary updates.
      },
    });

    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUserId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return {
      conversationId,
      readBy: currentUserId,
      updatedCount: result.count,
    };
  }

  async updateMessage(
    currentUserId: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException('Message content cannot be empty');
    }

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.ensureConversationParticipant(
      message.conversationId,
      currentUserId,
    );

    if (message.senderId !== currentUserId) {
      throw new ForbiddenException(
        'Only the sender can edit their own message',
      );
    }

    if (message.deletedAt) {
      throw new BadRequestException('Deleted messages cannot be edited');
    }

    return this.prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        content,
        editedAt: new Date(),
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
  }

  async deleteMessage(currentUserId: string, messageId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.ensureConversationParticipant(
      message.conversationId,
      currentUserId,
    );

    if (message.senderId !== currentUserId) {
      throw new NotFoundException('Message not found');
    }

    if (message.deletedAt) {
      throw new BadRequestException('Deleted messages cannot be deleted again');
    }

    return this.prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        content: 'This message was deleted',
        deletedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
  }
}
