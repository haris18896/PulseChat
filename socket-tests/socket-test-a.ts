import 'dotenv/config';
import { io } from 'socket.io-client';

const token = process.env.SOCKET_TEST_USER_A_TOKEN;
const conversationId = process.env.SOCKET_TEST_CONVERSATION_ID;
const socketTestUrl = process.env.SOCKET_TEST_URL;

if (!token || !conversationId || !socketTestUrl) {
  throw new Error(
    'Missing env vars: SOCKET_TEST_USER_A_TOKEN, SOCKET_TEST_CONVERSATION_ID, SOCKET_TEST_URL',
  );
}

const socket = io(socketTestUrl, {
  transports: ['websocket'],
  auth: { token },
});

socket.on('connect', () => {
  console.log('Client A connected:', socket.id);
});

socket.on('authenticated', (data) => {
  console.log('Client A authenticated:', data);

  socket.emit('join_conversation', {
    conversationId,
  });
});

socket.on('conversation_joined', (data) => {
  console.log('Client A joined conversation:', data);

  socket.emit('typing_start', { conversationId });

  setTimeout(() => {
    socket.emit('typing_stop', { conversationId });
  }, 1000);

  setTimeout(() => {
    socket.emit('send_message', {
      conversationId,
      content: `Socket test message from Client A - ${new Date().toISOString()}`,
    });
  }, 1500);
});

socket.on('message_sent', (data) => {
  console.log('Client A message sent successfully:', data);

  setTimeout(() => {
    socket.emit('edit_message', {
      messageId: data.id,
      content: `Edited through socket - ${new Date().toISOString()}`,
    });
  }, 1500);

  setTimeout(() => {
    socket.emit('delete_message', {
      messageId: data.id,
    });
  }, 3000);
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

socket.on('new_message', (data) => {
  console.log('Client A new message received:', data);
});

socket.on('message_delivered', (data) => {
  console.log('Client A message delivered event:', data);
});

socket.on('messages_read', (data) => {
  console.log('Client A messages read event:', data);
});

socket.on('user_typing_start', (data) => {
  console.log('Client A user typing start:', data);
});

socket.on('user_typing_stop', (data) => {
  console.log('Client A user typing stop:', data);
});

socket.on('user_online', (data) => {
  console.log('Client A user online:', data);
});

socket.on('user_offline', (data) => {
  console.log('Client A user offline:', data);
});

socket.on('exception', (error) => {
  console.log('Client A socket exception:', error);
});

socket.on('unauthorized', (data) => {
  console.log('Client A unauthorized:', data);
});

socket.on('connect_error', (error) => {
  console.error('Client A connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Client A disconnected:', reason);
});

// Catch-all event logger in the clients
socket.onAny((event, ...args) => {
  console.log('<< EVENT:', event, args);
});
