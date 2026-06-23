import { io } from 'socket.io-client';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTM1NDc4Mi02MTlkLTQ1NTYtYjBkMC1jMWQ2MjhiMGU5NDAiLCJlbWFpbCI6ImhhcmlzQHlvcG1haWwuY29tIiwiaWF0IjoxNzgyMjAwNzU5LCJleHAiOjE3ODI4MDU1NTl9.Xi3T5WboT0AT6hGiBMRLw1hZBItoDpAG9F081G12jcA';
const conversationId = '60c7fbb1-1616-4d85-8722-200f1765a1c5';

const socket = io('http://localhost:3000/chat', {
  transports: ['websocket'],
  auth: { token },
});
socket.on('connect', () => {
  console.log('Client A connected:', socket.id);
});

socket.on('user_online', (data) => {
  console.log('Client A user online:', data);
});

socket.on('user_offline', (data) => {
  console.log('Client A user offline:', data);
});

socket.on('authenticated', () => {
  socket.emit('join_conversation', {
    conversationId,
  });
});

socket.on('conversation_joined', (data) => {
  console.log('Client A joined conversation:', data);

  socket.emit('typing_start', {
    conversationId,
  });

  setTimeout(() => {
    socket.emit('typing_stop', {
      conversationId,
    });
  }, 3000);
});

socket.on('message_sent', (data) => {
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
