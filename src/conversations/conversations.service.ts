import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(currentUserId: string, dto: CreateConversationDto) {
    const uniqueParticipantIds = [
      ...new Set([currentUserId, ...dto.participantIds]),
    ];

    if (uniqueParticipantIds.length < 2) {
      throw new BadRequestException('At least 2 participants are required');
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: uniqueParticipantIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (users.length !== uniqueParticipantIds.length) {
      throw new BadRequestException('Some participants not found');
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        title: dto.title,
        isGroup: dto.isGroup ?? uniqueParticipantIds.length > 2,
        lastMessageAt: null,
        participants: {
          create: uniqueParticipantIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    return conversation;
  }

  getMyConversations(currentUserId: string) {
    return this.prisma.conversation.findMany({
      // Give me conversations where at least one participant is the current user.
      where: {
        participants: {
          some: {
            userId: currentUserId,
          },
        },
      },
      include: {
        // Give me the participants for each conversation.
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        // Give me the last message for each conversation.
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        // Give me the conversations with the most recent last message. and empty conversations should be at the bottom.
        {
          lastMessageAt: {
            sort: 'desc',
            nulls: 'last',
          },
        },
        // if no last message, give me the most recent created conversations.
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async getConversationById(currentUserId: string, conversationId: string) {
    // We are using findFirst because we check both conversationId and currentUserId in the where clause.
    // Find this conversation only if the current user belongs to it.
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: currentUserId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async isUserParticipant(
    userId: string,
    conversationId: string,
  ): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
      select: {
        id: true,
      },
    });

    return Boolean(participant);
  }

  async getConversationIdsForUser(userId: string): Promise<string[]> {
    const participant = await this.prisma.conversationParticipant.findMany({
      where: {
        userId,
      },
      select: {
        conversationId: true,
      },
    });

    return participant.map((p) => p.conversationId);
  }
}
