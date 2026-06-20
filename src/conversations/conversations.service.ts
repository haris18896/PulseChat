import { BadRequestException, Injectable } from '@nestjs/common';
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

  // findAll() {
  //   return `This action returns all conversations`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} conversation`;
  // }

  // update(id: number, updateConversationDto: UpdateConversationDto) {
  //   return `This action updates a #${id} conversation`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} conversation`;
  // }
}
