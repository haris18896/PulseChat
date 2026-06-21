import { io } from 'socket.io-client';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwYjVjNDAxZS05ODBiLTRkZDAtYTE5NC1hNWNhMGQyZTQwOTIiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwiaWF0IjoxNzgyMDQ0NTA3LCJleHAiOjE3ODI2NDkzMDd9.9VEAOGqiFEywSP7QaDLiRxnJ0E-TyTZhTgI2vcLal5Q';
const conversationId = '60c7fbb1-1616-4d85-8722-200f1765a1c5';

const socket = io('http://localhost:3000/chat', {
  transports: ['websocket'],
  auth: { token },
});
socket.on('connect', () => {
  console.log('Client B connected:', socket.id);
});

socket.on('authenticated', () => {
  socket.emit('join_conversation', {
    conversationId,
  });
});

socket.on('conversation_Joined', (data) => {
  console.log('Client B joined conversation:', data);

  socket.emit('send_message', {
    conversationId,
    content: 'Testing the new message event',
  });
});

socket.on('message_Sent', (data) => {
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
