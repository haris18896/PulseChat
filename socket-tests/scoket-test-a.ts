import { io } from 'socket.io-client';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjdlZjNjYS05OTAwLTRiN2UtYjk1ZS0wN2VjYzE2MzA2NDUiLCJlbWFpbCI6ImhhcmlzQHlvcG1haWwuY29tIiwiaWF0IjoxNzgyMDQ0NDMzLCJleHAiOjE3ODI2NDkyMzN9.2OstZuQmrPxYG68-l5Nac0eZ_FZ46tatXXdo5LOGcxc';
const conversationId = '60c7fbb1-1616-4d85-8722-200f1765a1c5';

const socket = io('http://localhost:3000/chat', {
  transports: ['websocket'],
  auth: { token },
});
socket.on('connect', () => {
  console.log('Client A connected:', socket.id);
});

socket.on('authenticated', () => {
  socket.emit('join_conversation', {
    conversationId,
  });
});

socket.on('conversation_Joined', (data) => {
  console.log('Client A joined conversation:', data);

  socket.emit('send_message', {
    conversationId,
    content: 'Testing the new message event',
  });
});

socket.on('message_Sent', (data) => {
  console.log('Client A message sent successfully: ', data);
});

socket.on('new_message', (data) => {
  console.log('Client A new message received: ', data);
});

socket.on('connect_error', (error) => {
  console.error('Client A connection error', error);
});

socket.on('disconnect', (reason) => {
  console.log('Client A disconnected from server', reason);
});
