import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test', quiet: true });

import { io, Socket } from 'socket.io-client';

jest.setTimeout(30000);

describe('Multi-instance Socket.IO Redis Adapter (e2e)', () => {
  const socketUrl = process.env.SOCKET_TEST_URL || 'http://localhost:8080/chat';

  const tokenA = process.env.SOCKET_TEST_USER_A_TOKEN;
  const tokenB = process.env.SOCKET_TEST_USER_B_TOKEN;
  const conversationId = process.env.SOCKET_TEST_CONVERSATION_ID;

  let clientA: Socket;
  let clientB: Socket;

  const waitForEvent = <T = any>(
    socket: Socket,
    event: string,
    timeout = 10000,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off(event, handler);
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      const handler = (data: T) => {
        clearTimeout(timer);
        resolve(data);
      };

      socket.once(event, handler);
    });
  };

  const connectClient = async (token: string): Promise<Socket> => {
    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token },
      forceNew: true,
    });

    await waitForEvent(socket, 'authenticated');

    return socket;
  };

  beforeAll(async () => {
    if (!tokenA || !tokenB || !conversationId) {
      throw new Error(
        'Missing SOCKET_TEST_USER_A_TOKEN, SOCKET_TEST_USER_B_TOKEN, or SOCKET_TEST_CONVERSATION_ID in .env.test',
      );
    }

    clientA = await connectClient(tokenA);
    clientB = await connectClient(tokenB);

    const joinedA = waitForEvent(clientA, 'conversation_joined');
    const joinedB = waitForEvent(clientB, 'conversation_joined');

    clientA.emit('join_conversation', { conversationId });
    clientB.emit('join_conversation', { conversationId });

    await Promise.all([joinedA, joinedB]);
  });

  afterAll(() => {
    clientA?.disconnect();
    clientB?.disconnect();
  });

  it('should broadcast typing event across scaled API instances', async () => {
    const typingEventForB = waitForEvent<any>(clientB, 'user_typing_start');

    clientA.emit('typing_start', {
      conversationId,
    });

    const event = await typingEventForB;

    expect(event.conversationId).toBe(conversationId);
    expect(event).toHaveProperty('userId');
  });

  it('should broadcast message across scaled API instances', async () => {
    const newMessageForB = waitForEvent<any>(clientB, 'new_message');

    const messageAckForA = Promise.race([
      waitForEvent<any>(clientA, 'message_sent'),
      waitForEvent<any>(clientA, 'message_Sent'),
    ]);

    clientA.emit('send_message', {
      conversationId,
      content: `Redis multi-instance test ${Date.now()}`,
    });

    const [newMessage, ack] = await Promise.all([
      newMessageForB,
      messageAckForA,
    ]);

    expect(newMessage).toHaveProperty('id');
    expect(newMessage.conversationId).toBe(conversationId);
    expect(newMessage.content).toContain('Redis multi-instance test');

    expect(ack).toHaveProperty('id');
  });

  it('should broadcast delivered event across scaled API instances', async () => {
    const newMessageForB = waitForEvent<any>(clientB, 'new_message');

    clientA.emit('send_message', {
      conversationId,
      content: `Redis delivery test ${Date.now()}`,
    });

    const message = await newMessageForB;

    const deliveredEventForA = waitForEvent<any>(clientA, 'message_delivered');

    clientB.emit('message_delivered', {
      conversationId,
      messageId: message.id,
    });

    const deliveredEvent = await deliveredEventForA;

    expect(deliveredEvent).toMatchObject({
      conversationId,
      messageId: message.id,
      status: 'DELIVERED',
    });
  });

  it('should broadcast read receipt across scaled API instances', async () => {
    const readEventForA = waitForEvent<any>(clientA, 'messages_read');

    clientB.emit('messages_read', {
      conversationId,
    });

    const readEvent = await readEventForA;

    expect(readEvent.conversationId).toBe(conversationId);
    expect(readEvent).toHaveProperty('readBy');
    expect(readEvent).toHaveProperty('updatedCount');
  });
});
