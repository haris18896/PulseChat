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

  private async findConversationForUserOrThrow(
    conversationId: string,
    userId: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private async findGroupConversationForUserOrThrow(
    conversationId: string,
    userId: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        isGroup: true,
        participants: {
          some: {
            userId,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Group conversation not found');
    }

    return conversation;
  }

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

  async getMyConversations(currentUserId: string) {
    const conversations = await this.prisma.conversation.findMany({
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

    const conversationsWithUnreadCount = await Promise.all(
      conversations.map(async (conversation) => {
        const currentParticipant = conversation.participants.find(
          (p) => p.userId === currentUserId,
        );

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: {
              not: currentUserId,
            },
            deletedAt: null,
            ...(currentParticipant?.lastReadAt
              ? {
                  createdAt: {
                    gt: currentParticipant.lastReadAt,
                  },
                }
              : {}),
          },
        });

        return {
          ...conversation,
          unreadCount,
        };
      }),
    );

    return conversationsWithUnreadCount;
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

  async updateGroupTitle(
    currentUserId: string,
    conversationId: string,
    title: string,
  ) {
    const cleanedTitle = title.trim();

    if (!cleanedTitle) {
      throw new BadRequestException('Title cannot be empty');
    }

    await this.findGroupConversationForUserOrThrow(
      conversationId,
      currentUserId,
    );

    return this.prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        title: cleanedTitle,
      },
      include: {
        participants: {
          select: {
            id: true,
            title: true,
            isGroup: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async addParticipantToGroup(
    currentUserId: string,
    conversationId: string,
    userIdToAdd: string,
  ) {
    await this.findGroupConversationForUserOrThrow(
      conversationId,
      currentUserId,
    );

    const userToAdd = await this.prisma.user.findFirst({
      where: {
        id: userIdToAdd,
      },
      select: {
        id: true,
      },
    });

    if (!userToAdd) {
      throw new NotFoundException('User not found');
    }

    const existingParticipant =
      await this.prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: userIdToAdd,
        },
        select: {
          id: true,
        },
      });

    if (existingParticipant) {
      throw new BadRequestException('User is already a participant');
    }

    return this.prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId: userToAdd.id,
      },
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
    });
  }

  async removeParticipantFromGroup(
    currentUserId: string,
    conversationId: string,
    userIdToRemove: string,
  ) {
    await this.findGroupConversationForUserOrThrow(
      conversationId,
      currentUserId,
    );

    const participantCount = await this.prisma.conversationParticipant.count({
      where: {
        conversationId,
      },
    });

    if (participantCount <= 1) {
      throw new BadRequestException('Cannot remove the last participant');
    }

    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: userIdToRemove,
      },
      select: {
        id: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    await this.prisma.conversationParticipant.delete({
      where: {
        id: participant.id,
      },
    });

    return {
      conversationId,
      removedUserId: userIdToRemove,
      removed: true,
    };
  }

  async leaveConversation(currentUserId: string, conversationId: string) {
    await this.findGroupConversationForUserOrThrow(
      conversationId,
      currentUserId,
    );

    const participantCount = await this.prisma.conversationParticipant.count({
      where: {
        conversationId,
      },
    });

    if (participantCount <= 1) {
      throw new BadRequestException('Cannot leave the last participant');
    }

    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: currentUserId,
      },
      select: {
        id: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    await this.prisma.conversationParticipant.delete({
      where: {
        id: participant.id,
      },
    });

    return {
      conversationId,
      leftUserId: currentUserId,
      left: true,
    };
  }
}
