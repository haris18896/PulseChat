import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ConversationController', () => {
  let controller: ConversationsController;

  const conversationsServiceMock = {
    createConversation: jest.fn(),
    getMyConversations: jest.fn(),
    getConversationById: jest.fn(),
    updateConversationTitle: jest.fn(),
    addParticipantToGroup: jest.fn(),
    removeParticipantFromGroup: jest.fn(),
    leaveConversation: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'user1@yopmail.com',
    username: 'User One',
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: conversationsServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ConversationsController>(ConversationsController);
  });

  describe('createConversation', () => {
    it('should call conversationsService.createConversation with user id and dto', async () => {
      const dto = {
        participantIds: ['user-2', 'user-3'],
        title: 'Conversation 1',
        isGroup: false,
      };

      const expectedConversation = {
        id: 'conversation-1',
        title: 'Conversation 1',
        isGroup: false,
        participants: [
          {
            id: 'participant-1',
            userId: 'user-1',
          },
        ],
        messages: [],
        lastMessageAt: null,
        lastMessageId: null,
        lastMessagePreview: null,
      };

      conversationsServiceMock.createConversation.mockResolvedValue(
        expectedConversation,
      );

      const result = await controller.createConversation(mockUser as any, dto);

      expect(result).toEqual(expectedConversation);
      expect(conversationsServiceMock.createConversation).toHaveBeenCalledWith(
        mockUser.id,
        dto,
      );
    });
  });

  describe('getMyConversations', () => {
    it('should call conversationsService.getMyConversations with user id', async () => {
      const expectedConversations = [
        {
          id: 'conversation-1',
          title: 'Conversation 1',
          isGroup: false,
          participants: [
            {
              id: 'participant-1',
              userId: 'user-1',
            },
          ],
          messages: [],
          lastMessageAt: null,
          lastMessageId: null,
          lastMessagePreview: null,
        },
      ];

      conversationsServiceMock.getMyConversations.mockResolvedValue(
        expectedConversations,
      );

      const result = await controller.getMyConversations(mockUser as any);

      expect(result).toEqual(expectedConversations);
      expect(conversationsServiceMock.getMyConversations).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('getConversationById', () => {
    it('should call conversationsService.getConversationById with user id and conversation id', async () => {
      const conversationId = 'conversation-1';

      const expectedConversation = {
        id: 'conversation-1',
        title: 'Conversation 1',
      };

      conversationsServiceMock.getConversationById.mockResolvedValue(
        expectedConversation,
      );

      const result = await controller.getConversationById(
        mockUser as any,
        conversationId,
      );

      expect(result).toEqual(expectedConversation);
      expect(conversationsServiceMock.getConversationById).toHaveBeenCalledWith(
        mockUser.id,
        conversationId,
      );
    });

    it('should throw NotFoundException if conversation not found', async () => {
      const conversationId = 'conversation-1';

      conversationsServiceMock.getConversationById.mockRejectedValue(
        new NotFoundException('Conversation not found'),
      );

      await expect(
        controller.getConversationById(mockUser as any, conversationId),
      ).rejects.toThrow(NotFoundException);
      expect(conversationsServiceMock.getConversationById).toHaveBeenCalledWith(
        mockUser.id,
        conversationId,
      );
    });
  });

  describe('updateConversationTitle', () => {
    it('should call conversationsService.updateConversationTitle with user id and conversation id and title', async () => {
      const conversationId = 'conversation-1';
      const dto = {
        title: 'Updated Conversation 2',
      };

      const expectedConversation = {
        id: 'conversation-1',
        title: 'Updated Conversation 1',
      };

      conversationsServiceMock.updateConversationTitle.mockResolvedValue(
        expectedConversation,
      );

      const result = await controller.updateConversationTitle(
        mockUser as any,
        conversationId,
        dto,
      );

      expect(result).toEqual(expectedConversation);
      expect(
        conversationsServiceMock.updateConversationTitle,
      ).toHaveBeenCalledWith(mockUser.id, conversationId, dto.title);
    });

    it('should throw BadRequestException if title is empty', async () => {
      const conversationId = 'conversation-1';
      const dto = {
        title: '',
      };

      await expect(
        controller.updateConversationTitle(
          mockUser as any,
          conversationId,
          dto,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(
        conversationsServiceMock.updateConversationTitle,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if title is too long', async () => {
      const conversationId = 'conversation-1';
      const dto = {
        title: 'a'.repeat(101),
      };

      conversationsServiceMock.updateConversationTitle.mockRejectedValue(
        new BadRequestException('Title cannot be too long'),
      );

      await expect(
        controller.updateConversationTitle(
          mockUser as any,
          conversationId,
          dto,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(
        conversationsServiceMock.updateConversationTitle,
      ).toHaveBeenCalledWith(mockUser.id, conversationId, dto.title);
    });

    it('should throw NotFoundException if conversation not found', async () => {
      const conversationId = 'conversation-1';
      const dto = {
        title: 'Updated Conversation 1',
      };

      conversationsServiceMock.updateConversationTitle.mockRejectedValue(
        new NotFoundException('Conversation not found'),
      );

      await expect(
        controller.updateConversationTitle(
          mockUser as any,
          conversationId,
          dto,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(
        conversationsServiceMock.updateConversationTitle,
      ).toHaveBeenCalledWith(mockUser.id, conversationId, dto.title);
    });
  });

  describe('addParticipantToGroup', () => {
    it('should call conversationsService.addParticipantToGroup with user id and conversation id and dto', async () => {
      const conversationId = 'conversation-1';
      const dto = {
        userId: 'user-2',
      };

      const expectedConversation = {
        id: 'conversation-1',
        title: 'Conversation 1',
      };

      conversationsServiceMock.addParticipantToGroup.mockResolvedValue(
        expectedConversation,
      );

      const result = await controller.addParticipantToGroup(
        mockUser as any,
        conversationId,
        dto,
      );

      expect(result).toEqual(expectedConversation);
      expect(
        conversationsServiceMock.addParticipantToGroup,
      ).toHaveBeenCalledWith(mockUser.id, conversationId, dto.userId);
    });

    it('should throw NotFoundException if user not found', async () => {
      const conversationId = 'conversation-1';
      const dto = {
        userId: 'user-2',
      };

      conversationsServiceMock.addParticipantToGroup.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.addParticipantToGroup(mockUser as any, conversationId, dto),
      ).rejects.toThrow(NotFoundException);
      expect(
        conversationsServiceMock.addParticipantToGroup,
      ).toHaveBeenCalledWith(mockUser.id, conversationId, dto.userId);
    });

    it('should throw BadRequestException if user is already a participant', async () => {
      const conversationId = 'conversation-1';
      const dto = {
        userId: 'user-2',
      };

      conversationsServiceMock.addParticipantToGroup.mockRejectedValue(
        new BadRequestException('User is already a participant'),
      );

      await expect(
        controller.addParticipantToGroup(mockUser as any, conversationId, dto),
      ).rejects.toThrow(BadRequestException);
      expect(
        conversationsServiceMock.addParticipantToGroup,
      ).toHaveBeenCalledWith(mockUser.id, conversationId, dto.userId);
    });
  });

  describe('removeParticipantFromGroup', () => {
    it('should call conversationsService.removeParticipantFromGroup with user id and conversation id and userId', async () => {
      const conversationId = 'conversation-1';
      const userId = 'user-2';

      const expectedConversation = {
        id: 'conversation-1',
        title: 'Conversation 1',
      };

      conversationsServiceMock.removeParticipantFromGroup.mockResolvedValue(
        expectedConversation,
      );

      const result = await controller.removeParticipantFromGroup(
        mockUser as any,
        conversationId,
        userId,
      );

      expect(result).toEqual(expectedConversation);
      expect(
        conversationsServiceMock.removeParticipantFromGroup,
      ).toHaveBeenCalledWith(mockUser.id, conversationId, userId);
    });

    it('should throw NotFoundException if user not found', async () => {
      const conversationId = 'conversation-1';
      const userId = 'user-2';

      conversationsServiceMock.removeParticipantFromGroup.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.removeParticipantFromGroup(
          mockUser as any,
          conversationId,
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(
        conversationsServiceMock.removeParticipantFromGroup,
      ).toHaveBeenCalledWith(mockUser.id, conversationId, userId);
    });

    it('should throw BadRequestException if user is the last participant', async () => {
      const conversationId = 'conversation-1';
      const userId = 'user-2';

      conversationsServiceMock.removeParticipantFromGroup.mockRejectedValue(
        new BadRequestException('Cannot remove the last participant'),
      );

      await expect(
        controller.removeParticipantFromGroup(
          mockUser as any,
          conversationId,
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(
        conversationsServiceMock.removeParticipantFromGroup,
      ).toHaveBeenCalledWith(mockUser.id, conversationId, userId);
    });
  });

  describe('leaveConversation', () => {
    it('should call conversationsService.leaveConversation with user id and conversation id', async () => {
      const conversationId = 'conversation-1';

      const expectedConversation = {
        id: 'conversation-1',
        title: 'Conversation 1',
      };

      conversationsServiceMock.leaveConversation.mockResolvedValue(
        expectedConversation,
      );

      const result = await controller.leaveConversation(
        mockUser as any,
        conversationId,
      );

      expect(result).toEqual(expectedConversation);
      expect(conversationsServiceMock.leaveConversation).toHaveBeenCalledWith(
        mockUser.id,
        conversationId,
      );
    });

    it('should throw NotFoundException if conversation not found', async () => {
      const conversationId = 'conversation-1';

      conversationsServiceMock.leaveConversation.mockRejectedValue(
        new NotFoundException('Conversation not found'),
      );

      await expect(
        controller.leaveConversation(mockUser as any, conversationId),
      ).rejects.toThrow(NotFoundException);
      expect(conversationsServiceMock.leaveConversation).toHaveBeenCalledWith(
        mockUser.id,
        conversationId,
      );
    });
  });
});
