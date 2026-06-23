import { io } from 'socket.io-client';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkMjA2MWY3YS00OTgxLTQwMzMtYjcyNi0yZDliMWI4MzM3NGIiLCJlbWFpbCI6Im11c2FAeW9wbWFpbC5jb20iLCJpYXQiOjE3ODIyMDA4NzMsImV4cCI6MTc4MjgwNTY3M30.vKfrKDbEh6MS_U9ZguA-Kvx32Y_aFT2-fah8zyQwhkc';
const conversationId = '60c7fbb1-1616-4d85-8722-200f1765a1c5';

const socket = io('http://localhost:3000/chat', {
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
  });
});

socket.on('conversation_joined', (data) => {
  console.log('Client B joined conversation:', data);

  socket.on('user_typing_start', (data) => {
    console.log('User is typing...', data);
  });

  socket.on('user_typing_stop', (data) => {
    console.log('User stopped typing...', data.userId);
  });

  //   socket.emit('send_message', {
  //     conversationId,
  //     content: 'Testing the new message event',
  //   });
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
