import { io } from 'socket.io-client';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjdlZjNjYS05OTAwLTRiN2UtYjk1ZS0wN2VjYzE2MzA2NDUiLCJlbWFpbCI6ImhhcmlzQHlvcG1haWwuY29tIiwiaWF0IjoxNzgyMDQzMzMzLCJleHAiOjE3ODI2NDgxMzN9.pSBLPcYGSgtV0GMVbbGSH7wt2_utQwUR9Pz0O175KRo';

const conversationId = '60c7fbb1-1616-4d85-8722-200f1765a1c5';

const socket = io('http://localhost:3000/chat', {
  transports: ['websocket'],
  auth: {
    token,
  },
});

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('authenticated', () => {
  socket.emit('join_conversation', {
    conversationId,
  });
});

socket.on('conversation_Joined', (data) => {
  console.log('Conversation joined', data);
});

socket.on('connect_error', (error) => {
  console.error('Connection error', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server', reason);
});
