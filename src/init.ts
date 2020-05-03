import io from 'socket.io';
import { Server as WsServer } from 'socket.io';
import { AddressInfo } from 'net';
import { Server } from 'http';

import { app } from './app';
import { initSocket } from './socket';

export function initServer(
  port: number,
): { server: Server, wss: WsServer } {
  const server = app.listen(port, '0.0.0.0', () => {
    const { address } = server.address() as AddressInfo;

    console.log('Server listening on:', 'http://' + address + ':' + port);
  });

  const wss = io(server);

  initSocket(wss);

  return { server, wss };
}
