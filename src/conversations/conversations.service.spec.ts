import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prismaMock: any; // Fake Prisma, the test does not go to PostgreSQL. It calls a mocked function:findUnique: jest.fn(), So the test is fast, isolated, and predictable.

  // This creates a fresh fake Prisma object before every test. That is important because one test’s mocked return values should not leak into the next test.
  beforeEach(async () => {
    prismaMock = {
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      conversation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      conversationParticipant: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      message: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  describe('createConversation', () => {
    it('should create a conversationwith unique participants', async () => {
      // When it checks users in the database, pretend both users exist.
      prismaMock.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
        },
        {
          id: 'user-2',
        },
      ]);

      const conversation = {
        id: 'conversation-1',
        title: 'Test Conversation',
        isGroup: false,
      };

      // This confirms your service created the conversation with the correct title, group flag, and participants.
      prismaMock.conversation.create.mockResolvedValue(conversation);

      const result = await service.createConversation('user-1', {
        participantIds: ['user-2'],
        title: 'Test Conversation',
        isGroup: false,
      });

      expect(result).toEqual(conversation);
      expect(prismaMock.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Conversation',
            isGroup: false,
            participants: {
              create: [{ userId: 'user-1' }, { userId: 'user-2' }],
            },
          }),
        }),
      );
    });

    it('should reject conversation with less than 2 participants', async () => {
      // This confirms your service blocks invalid input. Here, a conversation cannot be created with only one user.
      await expect(
        service.createConversation('user-1', {
          participantIds: [],
          title: 'Invalid',
          isGroup: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject missing participants', async () => {
      // When it checks users in the database, pretend only one user exists.
      prismaMock.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
        },
      ]);

      // This confirms your service blocks invalid input. Here, a conversation cannot be created with a missing participant.
      await expect(
        service.createConversation('user-1', {
          participantIds: ['user-2'],
          title: 'Invalid',
          isGroup: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-existent participants', async () => {
      // When it checks users in the database, pretend only one user exists.
      prismaMock.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
        },
      ]);

      // This confirms your service blocks invalid input. Here, a conversation cannot be created with a non-existent participant.
      await expect(
        service.createConversation('user-1', {
          participantIds: ['user-2'],
          title: 'Invalid',
          isGroup: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyConversations', () => {
    it('should return conversation with unread count', async () => {
      // When it checks conversations in the database, pretend there is one conversation with two participants.
      prismaMock.conversation.findMany.mockResolvedValue([
        {
          id: 'conversation-1',
          participants: [
            {
              userId: 'user-1',
              lastReadAt: new Date('2026-06-26T12:00:00Z'),
            },
            {
              userId: 'user-2',
              lastReadAt: null,
            },
          ],
        },
      ]);

      // When it checks messages in the database, pretend there are two messages that are unread.
      prismaMock.message.count.mockResolvedValue(2);

      // This confirms your service returns the correct unread count for the conversation.
      const result = await service.getMyConversations('user-1');

      // This confirms your service returns the correct unread count for the conversation.
      expect(result[0].unreadCount).toBe(2);
      // This confirms your service checks messages in the database with the correct parameters.
      expect(prismaMock.message.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            conversationId: 'conversation-1',
            senderId: {
              not: 'user-1',
            },
          }),
        }),
      );
    });
  });

  describe('getConversationById', () => {
    it('should return conversation for participant', async () => {
      const conversation = {
        id: 'conversation-1',
        title: 'Test',
      };

      // This confirms your service returns the correct conversation for the participant.
      prismaMock.conversation.findFirst.mockResolvedValue(conversation);

      const result = await service.getConversationById(
        'user-1',
        'conversation-1',
      );

      expect(result).toEqual(conversation);
    });

    it('should reject non-participant access', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.getConversationById('user-1', 'conversation-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isUserParticipant', () => {
    it('should return true when participant exists', async () => {
      // This confirms your service returns true when the participant exists.
      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      // This confirms your service returns true when the participant exists.
      const result = await service.isUserParticipant(
        'user-1',
        'conversation-1',
      );

      expect(result).toBe(true);
    });

    it('should return false when participant does not exist', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue(null);

      const result = await service.isUserParticipant(
        'user-1',
        'conversation-1',
      );

      expect(result).toBe(false);
    });
  });

  describe('updateGroupTitle', () => {
    it('should update group title', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue({
        id: 'conversation-1',
        isGroup: true,
      });

      prismaMock.conversation.update.mockResolvedValue({
        id: 'conversation-1',
        title: 'Updated Group',
      });

      const result = await service.updateConversationTitle(
        'user-1',
        'conversation-1',
        ' Updated Group ',
      );

      expect(result.title).toBe('Updated Group');
    });

    it('should reject empty title', async () => {
      await expect(
        service.updateConversationTitle('user-1', 'conversation-1', '   '),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addParticipant', () => {
    it('should add participant to group', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue({
        id: 'conversation-1',
        isGroup: true,
      });

      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-2',
      });

      prismaMock.conversationParticipant.findFirst.mockResolvedValue(null);

      prismaMock.conversationParticipant.create.mockResolvedValue({
        id: 'participant-2',
        userId: 'user-2',
      });

      const result = await service.addParticipantToGroup(
        'user-1',
        'conversation-1',
        'user-2',
      );

      expect(result.userId).toBe('user-2');
    });

    it('should reject duplicate participant', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue({
        id: 'conversation-1',
        isGroup: true,
      });

      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-2',
      });

      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-2',
      });

      await expect(
        service.addParticipantToGroup('user-1', 'conversation-1', 'user-2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant from group', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue({
        id: 'conversation-1',
        isGroup: true,
      });

      prismaMock.conversationParticipant.count.mockResolvedValue(2);

      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-2',
        userId: 'user-2',
      });

      prismaMock.conversationParticipant.delete.mockResolvedValue({
        id: 'participant-2',
        userId: 'user-2',
      });

      const result = await service.removeParticipantFromGroup(
        'user-1',
        'conversation-1',
        'user-2',
      );

      expect(result.removedUserId).toBe('user-2');
    });

    it('should reject removing last participant', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue({
        id: 'conversation-1',
        isGroup: true,
      });

      prismaMock.conversationParticipant.count.mockResolvedValue(1);

      await expect(
        service.removeParticipantFromGroup(
          'user-1',
          'conversation-1',
          'user-2',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('leaveConversation', () => {
    it('should allow participant to leave group conversation', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue({
        id: 'conversation-1',
        isGroup: true,
      });

      prismaMock.conversationParticipant.count.mockResolvedValue(3);

      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      prismaMock.conversationParticipant.delete.mockResolvedValue({});

      const result = await service.leaveConversation(
        'user-1',
        'conversation-1',
      );

      expect(result).toEqual({
        conversationId: 'conversation-1',
        leftUserId: 'user-1',
        left: true,
      });
    });

    it('should reject leaving as last participant', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue({
        id: 'conversation-1',
        isGroup: true,
      });

      prismaMock.conversationParticipant.count.mockResolvedValue(1);

      await expect(
        service.leaveConversation('user-1', 'conversation-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
