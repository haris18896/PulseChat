import { io } from 'socket.io-client';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjdlZjNjYS05OTAwLTRiN2UtYjk1ZS0wN2VjYzE2MzA2NDUiLCJlbWFpbCI6ImhhcmlzQHlvcG1haWwuY29tIiwiaWF0IjoxNzgyMDM0ODQxLCJleHAiOjE3ODI2Mzk2NDF9.5keR46sGei_I7garPNgLdx3VnXb8WwPxvsu2B4Qysd0';

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
  socket.emit('ping', {
    message: 'Hello from authenticated socket client',
  });
});

socket.on('pong', (data) => {
  console.log('Pong received from server', data);
});

socket.on('connect_error', (error) => {
  console.error('Connection error', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server', reason);
});
