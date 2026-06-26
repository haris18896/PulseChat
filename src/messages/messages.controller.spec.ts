import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';

describe('MessagesController', () => {
  let controller: MessagesController;

  const messagesServiceMock = {
    createMessage: jest.fn(),
    getMessagesByConversation: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'user1@yopmail.com',
    username: 'User One',
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: messagesServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<MessagesController>(MessagesController);
  });

  describe('createMessage', () => {
    it('should call messagesService.createMessage with user id and dto', async () => {
      const dto = {
        conversationId: 'conversation-1',
        content: 'Hello',
      };

      const expectedMessage = {
        id: 'message-1',
        ...dto,
        senderId: mockUser.id,
      };

      messagesServiceMock.createMessage.mockResolvedValue(expectedMessage);

      const result = await controller.createMessage(mockUser as any, dto);

      expect(result).toEqual(expectedMessage);
      expect(messagesServiceMock.createMessage).toHaveBeenCalledWith(
        mockUser.id,
        dto,
      );
    });
  });

  describe('getMessagesByConversation', () => {
    it('should call messagesService.getMessagesByConversation', async () => {
      const conversationId = 'conversation-1';
      const query = {
        limit: 20,
      };

      const expectedResult = {
        items: [
          {
            id: 'message-1',
            content: 'Hello',
          },
        ],
        pageInfo: {
          nextCursor: null,
          hasNextPage: false,
        },
      };

      messagesServiceMock.getMessagesByConversation.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getMessagesByConversation(
        mockUser as any,
        conversationId,
        query,
      );

      expect(result).toEqual(expectedResult);
      expect(
        messagesServiceMock.getMessagesByConversation,
      ).toHaveBeenCalledWith(mockUser.id, conversationId, query);
    });
  });

  describe('updateMessage', () => {
    it('should call messagesService.updateMessage', async () => {
      const messageId = 'message-1';
      const dto = {
        content: 'Updated message',
      };

      const expectedMessage = {
        id: messageId,
        content: dto.content,
        senderId: mockUser.id,
      };

      messagesServiceMock.updateMessage.mockResolvedValue(expectedMessage);

      const result = await controller.updateMessage(
        mockUser as any,
        messageId,
        dto,
      );

      expect(result).toEqual(expectedMessage);
      expect(messagesServiceMock.updateMessage).toHaveBeenCalledWith(
        mockUser.id,
        messageId,
        dto,
      );
    });
  });

  describe('deleteMessage', () => {
    it('should call messagesService.deleteMessage', async () => {
      const messageId = 'message-1';

      const expectedMessage = {
        id: messageId,
        content: 'This message was deleted',
        senderId: mockUser.id,
      };

      messagesServiceMock.deleteMessage.mockResolvedValue(expectedMessage);

      const result = await controller.deleteMessage(mockUser as any, messageId);

      expect(result).toEqual(expectedMessage);
      expect(messagesServiceMock.deleteMessage).toHaveBeenCalledWith(
        mockUser.id,
        messageId,
      );
    });
  });
});
