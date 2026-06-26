import 'dotenv/config';
import { io } from 'socket.io-client';

const token = process.env.SOCKET_TEST_USER_B_TOKEN;
const conversationId = process.env.SOCKET_TEST_CONVERSATION_ID;
const socketTestUrl = process.env.SOCKET_TEST_URL;

if (!token || !conversationId || !socketTestUrl) {
  throw new Error(
    'Missing env vars: SOCKET_TEST_USER_B_TOKEN, SOCKET_TEST_CONVERSATION_ID, SOCKET_TEST_URL',
  );
}

const socket = io(socketTestUrl, {
  transports: ['websocket'],
  auth: { token },
});

socket.on('connect', () => {
  console.log('Client B connected:', socket.id);
});

socket.on('authenticated', (data) => {
  console.log('Client B authenticated:', data);

  socket.emit('join_conversation', {
    conversationId,
  });
});

socket.on('conversation_joined', (data) => {
  console.log('Client B joined conversation:', data);
});

socket.on('new_message', (data) => {
  console.log('Client B new message received:', data);

  socket.emit('message_delivered', {
    conversationId: data.conversationId,
    messageId: data.id,
  });

  setTimeout(() => {
    socket.emit('messages_read', {
      conversationId: data.conversationId,
    });
  }, 1000);
});

socket.on('message_delivered', (data) => {
  console.log('Client B message delivered event:', data);
});

socket.on('message_delivered_ack', (data) => {
  console.log('Client B delivery ack:', data);
});

socket.on('messages_read', (data) => {
  console.log('Client B messages read event:', data);
});

socket.on('messages_read_ack', (data) => {
  console.log('Client B messages read ack:', data);
});

socket.on('user_typing_start', (data) => {
  console.log('Client B user typing start:', data);
});

socket.on('user_typing_stop', (data) => {
  console.log('Client B user typing stop:', data);
});

socket.on('user_online', (data) => {
  console.log('Client B user online:', data);
});

socket.on('user_offline', (data) => {
  console.log('Client B user offline:', data);
});

socket.on('message_edited', (data) => {
  console.log('Message edited:', data);
});

socket.on('message_edited_ack', (data) => {
  console.log('Edit ack:', data);
});

socket.on('message_deleted', (data) => {
  console.log('Message deleted:', data);
});

socket.on('message_deleted_ack', (data) => {
  console.log('Delete ack:', data);
});

socket.on('exception', (error) => {
  console.log('Client B socket exception:', error);
});

socket.on('unauthorized', (data) => {
  console.log('Client B unauthorized:', data);
});

socket.on('connect_error', (error) => {
  console.error('Client B connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Client B disconnected:', reason);
});

// Catch-all event logger in the clients
socket.onAny((event, ...args) => {
  console.log('<< EVENT:', event, args);
});
