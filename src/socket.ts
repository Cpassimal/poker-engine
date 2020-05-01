import { Server } from 'socket.io';

export function initSocket(server: Server): void {
  server.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('message', (message: string) => {
      console.log(message);
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });
}
