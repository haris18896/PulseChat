import { io } from 'socket.io-client';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkMjA2MWY3YS00OTgxLTQwMzMtYjcyNi0yZDliMWI4MzM3NGIiLCJlbWFpbCI6Im11c2FAeW9wbWFpbC5jb20iLCJpYXQiOjE3ODIyMDExNDksImV4cCI6MTc4MjgwNTk0OX0.vGzesS5aL854BNeQn1h4T7Dnl9kORcIRMs9BS37sw84';
const conversationId = '32bf31c7-55f7-42a0-a145-dc69bc937dca';

const socket = io('http://localhost:8080/chat', {
  transports: ['websocket'],
  auth: { token },
});
socket.on('connect', () => {
  console.log('Client B connected:', socket.id);
});

socket.on('user_online', (data) => {
  console.log('Client B user online:', data);
});

socket.on('user_offline', (data) => {
  console.log('Client B user offline:', data);
});

socket.on('authenticated', () => {
  socket.emit('join_conversation', {
    conversationId,
    // conversationId: 'wrong-id',
  });
});

socket.on('unauthorized', (data) => {
  console.log('Unauthorized:', data);
});

socket.on('conversation_joined', (data) => {
  console.log('Client B joined conversation:', data);

  socket.on('user_typing_start', (data) => {
    console.log('User is typing...', data);
  });

  socket.emit('messages_read', {
    conversationId,
  });

  socket.on('messages_read', (data) => {
    console.log('Messages read event:', data);
  });

  socket.on('messages_read_ack', (data) => {
    console.log('Messages read ack:', data);
  });

  socket.on('user_typing_stop', (data) => {
    console.log('User stopped typing...', data.userId);
  });

  //   socket.emit('send_message', {
  //     conversationId,
  //     content: 'Testing the new message event',
  //   });
});

socket.emit('edit_message', {
  messageId: 'MESSAGE_ID',
  content: 'Updated through socket',
});

socket.on('message_edited', (data) => {
  console.log('Message edited:', data);
});

socket.on('message_edited_ack', (data) => {
  console.log('Edit ack:', data);
});

socket.on('exception', (error) => {
  console.log('Socket exception:', error);
});

socket.on('message_sent', (data) => {
  console.log('Client B message sent successfully: ', data);
});

socket.on('new_message', (data) => {
  console.log('Client B new message received: ', data);
});

socket.on('connect_error', (error) => {
  console.error('Client B connection error', error);
});

socket.on('disconnect', (reason) => {
  console.log('Client B disconnected from server', reason);
});

socket.emit('delete_message', {
  messageId: 'MESSAGE_ID',
});

socket.on('message_deleted', (data) => {
  console.log('Message deleted:', data);
});

socket.on('message_deleted_ack', (data) => {
  console.log('Delete ack:', data);
});
