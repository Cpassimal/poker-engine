import { v4 as uuid } from 'uuid';
import io from 'socket.io';

import { Server } from 'socket.io';
import { players } from './tools/data';
import { IPlayer } from './tools/interfaces';
import { sitToTable } from './game/game';

export interface IWSJoin {
  tableId: string;
  playerId: string;
}

export function initSocket(server: Server): void {
  server.on('connection', (socket) => {
    const player: IPlayer = {
      id: uuid(),
    };

    players.push(player);

    console.log('a user connected:', player.id);

    socket.emit('connected', player);

    socket.on('join', (body: IWSJoin) => {
      sitToTable(body.tableId, body.playerId);
      socket.join(body.tableId);

      server.to(body.tableId).emit('new-player', { playerId: body.playerId });
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });
}
