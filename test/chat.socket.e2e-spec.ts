import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test', quiet: true });

import { io, Socket } from 'socket.io-client';

describe('Chat Socket.IO Integration', () => {
  const socketUrl = process.env.SOCKET_TEST_URL || 'http://localhost:8080/chat';

  const tokenA = process.env.SOCKET_TEST_USER_A_TOKEN;
  const tokenB = process.env.SOCKET_TEST_USER_B_TOKEN;
  const conversationId = process.env.SOCKET_TEST_CONVERSATION_ID;

  let clientA: Socket;
  let clientB: Socket;
  let messageId: string;

  const waitForEvent = <T = any>(
    socket: Socket,
    event: string,
    timeout = 8000,
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

  beforeAll(() => {
    if (!tokenA || !tokenB || !conversationId) {
      throw new Error(
        'Missing SOCKET_TEST_USER_A_TOKEN, SOCKET_TEST_USER_B_TOKEN, or SOCKET_TEST_CONVERSATION_ID in .env.test',
      );
    }
  });

  afterAll(() => {
    clientA?.disconnect();
    clientB?.disconnect();
  });

  it('should authenticate both socket clients', async () => {
    clientA = await connectClient(tokenA!);
    clientB = await connectClient(tokenB!);

    expect(clientA.connected).toBe(true);
    expect(clientB.connected).toBe(true);
  });

  it('should join both clients to conversation room', async () => {
    const joinedA = waitForEvent(clientA, 'conversation_joined');
    const joinedB = waitForEvent(clientB, 'conversation_joined');

    clientA.emit('join_conversation', { conversationId });
    clientB.emit('join_conversation', { conversationId });

    const resultA = await joinedA;
    const resultB = await joinedB;

    expect(resultA).toMatchObject({
      conversationId,
      joined: true,
    });

    expect(resultB).toMatchObject({
      conversationId,
      joined: true,
    });
  });

  it('should broadcast typing events', async () => {
    const typingStart = waitForEvent<any>(clientB, 'user_typing_start');
    const typingStop = waitForEvent<any>(clientB, 'user_typing_stop');

    clientA.emit('typing_start', { conversationId });
    clientA.emit('typing_stop', { conversationId });

    const startEvent = await typingStart;
    const stopEvent = await typingStop;

    expect(startEvent.conversationId).toBe(conversationId);
    expect(stopEvent.conversationId).toBe(conversationId);
  });

  it('should send message and receive new_message', async () => {
    const newMessageForB = waitForEvent<any>(clientB, 'new_message');

    // Temporary support for current server event name
    const messageSentAck = Promise.race([
      waitForEvent<any>(clientA, 'message_sent'),
      waitForEvent<any>(clientA, 'message_Sent'),
    ]);

    clientA.emit('send_message', {
      conversationId,
      content: `Socket integration message ${Date.now()}`,
    });

    const newMessage = await newMessageForB;
    const sentAck = await messageSentAck;

    expect(newMessage).toHaveProperty('id');
    expect(newMessage.conversationId).toBe(conversationId);
    expect(newMessage.status).toBe('SENT');

    expect(sentAck).toHaveProperty('id');

    messageId = newMessage.id;
  }, 15000);

  it('should mark message delivered', async () => {
    const deliveredEventForA = waitForEvent<any>(clientA, 'message_delivered');
    const deliveredAckForB = waitForEvent<any>(
      clientB,
      'message_delivered_ack',
    );

    clientB.emit('message_delivered', {
      conversationId,
      messageId,
    });

    const deliveredEvent = await deliveredEventForA;
    const deliveredAck = await deliveredAckForB;

    expect(deliveredEvent).toMatchObject({
      conversationId,
      messageId,
      status: 'DELIVERED',
    });

    expect(deliveredAck).toMatchObject({
      conversationId,
      messageId,
      status: 'DELIVERED',
    });
  });

  it('should mark messages as read', async () => {
    const readEventForA = waitForEvent<any>(clientA, 'messages_read');
    const readAckForB = waitForEvent<any>(clientB, 'messages_read_ack');

    clientB.emit('messages_read', {
      conversationId,
    });

    const readEvent = await readEventForA;
    const readAck = await readAckForB;

    expect(readEvent.conversationId).toBe(conversationId);
    expect(readEvent).toHaveProperty('updatedCount');

    expect(readAck.conversationId).toBe(conversationId);
    expect(readAck).toHaveProperty('updatedCount');
  });

  it('should edit message through socket', async () => {
    const editedEventForB = waitForEvent<any>(clientB, 'message_edited');
    const editedAckForA = waitForEvent<any>(clientA, 'message_edited_ack');

    clientA.emit('edit_message', {
      messageId,
      content: `Edited by socket test ${Date.now()}`,
    });

    const editedEvent = await editedEventForB;
    const editedAck = await editedAckForA;

    expect(editedEvent.message.id).toBe(messageId);
    expect(editedEvent.message.editedAt).toBeTruthy();

    expect(editedAck.id).toBe(messageId);
    expect(editedAck.editedAt).toBeTruthy();
  });

  it('should delete message through socket', async () => {
    const deletedEventForB = waitForEvent<any>(clientB, 'message_deleted');
    const deletedAckForA = waitForEvent<any>(clientA, 'message_deleted_ack');

    clientA.emit('delete_message', {
      messageId,
    });

    const deletedEvent = await deletedEventForB;
    const deletedAck = await deletedAckForA;

    expect(deletedEvent.message.id).toBe(messageId);
    expect(deletedEvent.message.deletedAt).toBeTruthy();

    expect(deletedAck.id).toBe(messageId);
    expect(deletedAck.deletedAt).toBeTruthy();
  });
});
