import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MessageStatus } from 'generated/Prisma';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      conversationParticipant: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      message: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      conversation: {
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    prismaMock.$transaction.mockImplementation((callback: any) =>
      callback({
        message: prismaMock.message,
        conversation: prismaMock.conversation,
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  describe('createMessage', () => {
    it('should create a message when user is participant of the conversation', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      const createdMessage = {
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'user-1',
        content: 'Hello',
        status: MessageStatus.SENT,
        createdAt: new Date(),
      };

      prismaMock.message.create.mockResolvedValue(createdMessage);
      prismaMock.conversation.update.mockResolvedValue({});

      const result = await service.createMessage('user-1', {
        conversationId: 'conversation-1',
        content: ' Hello ',
      });

      expect(result).toEqual(createdMessage);
      expect(prismaMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversationId: 'conversation-1',
            senderId: 'user-1',
            content: 'Hello',
            status: MessageStatus.SENT,
          }),
        }),
      );
    });

    it('should reject empty message content', async () => {
      await expect(
        service.createMessage('user-1', {
          conversationId: 'conversation-1',
          content: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-participant access', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.createMessage('user-1', {
          conversationId: 'conversation-1',
          content: 'Hello',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMessagesByConversation', () => {
    it('should return paginated messages for participant', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      prismaMock.message.findMany.mockResolvedValue([
        { id: 'message-2', content: 'Second' },
        { id: 'message-1', content: 'First' },
      ]);

      const result = await service.getMessagesByConversation(
        'user-1',
        'conversation-1',
        { limit: 20 },
      );

      expect(result.items).toEqual([
        { id: 'message-1', content: 'First' },
        { id: 'message-2', content: 'Second' },
      ]);

      expect(result.pageInfo).toEqual({
        nextCursor: null,
        hasNextPage: false,
      });
    });

    it('should reject non-participant access', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.getMessagesByConversation('user-1', 'conversation-1', {
          limit: 20,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markMessageDelivered', () => {
    it('should mark message as delivered', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      prismaMock.message.findFirst.mockResolvedValue({
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'user-1',
        status: MessageStatus.SENT,
      });

      prismaMock.message.update.mockResolvedValue({
        id: 'message-1',
        status: MessageStatus.DELIVERED,
      });

      const result = await service.markMessageDelivered(
        'user-2',
        'conversation-1',
        'message-1',
      );

      expect(result.status).toBe(MessageStatus.DELIVERED);
    });

    it('should not allow sender to mark own message delivered', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      prismaMock.message.findFirst.mockResolvedValue({
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'user-1',
        status: MessageStatus.SENT,
      });

      await expect(
        service.markMessageDelivered('user-1', 'conversation-1', 'message-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markConversationMessagesRead', () => {
    it('should mark conversation messages as read', async () => {
      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      prismaMock.message.updateMany.mockResolvedValue({
        count: 3,
      });

      prismaMock.conversationParticipant.update.mockResolvedValue({
        id: 'participant-1',
      });

      const result = await service.markConversationMessagesRead(
        'user-2',
        'conversation-1',
      );

      expect(result).toEqual({
        conversationId: 'conversation-1',
        readBy: 'user-2',
        updatedCount: 3,
      });

      expect(prismaMock.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: MessageStatus.READ,
          },
        }),
      );
    });
  });

  describe('updateMessage', () => {
    it('should allow sender to edit own message', async () => {
      prismaMock.message.findFirst.mockResolvedValue({
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'user-1',
        deletedAt: null,
      });

      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      prismaMock.message.update.mockResolvedValue({
        id: 'message-1',
        content: 'Updated',
        editedAt: new Date(),
      });

      const result = await service.updateMessage('user-1', 'message-1', {
        content: ' Updated ',
      });

      expect(result.content).toBe('Updated');
    });

    it('should reject editing another user message', async () => {
      prismaMock.message.findFirst.mockResolvedValue({
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'user-2',
        deletedAt: null,
      });

      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      await expect(
        service.updateMessage('user-1', 'message-1', {
          content: 'Updated',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMessage', () => {
    it('should allow sender to delete own message', async () => {
      prismaMock.message.findFirst.mockResolvedValue({
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'user-1',
        deletedAt: null,
      });

      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      prismaMock.message.update.mockResolvedValue({
        id: 'message-1',
        content: 'This message was deleted',
        deletedAt: new Date(),
      });

      const result = await service.deleteMessage('user-1', 'message-1');

      expect(result.content).toBe('This message was deleted');
    });

    it('should reject deleting another user message', async () => {
      prismaMock.message.findFirst.mockResolvedValue({
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'user-2',
        deletedAt: null,
      });

      prismaMock.conversationParticipant.findFirst.mockResolvedValue({
        id: 'participant-1',
      });

      await expect(
        service.deleteMessage('user-1', 'message-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
