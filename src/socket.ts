import { v4 as uuid } from 'uuid';

import { Server } from 'socket.io';
import { players, tables } from './tools/data';
import { IPlayer, ITable } from './tools/interfaces';
import { initPlayers, sitToTable } from './game/game';
import { dealCards, getPlayerForClient, getTableForClient } from './tools/helper';

export interface IWSJoin {
  tableId: string;
}

export interface IWSStart {
  tableId: string;
  player: IPlayer;
}

export function initSocket(server: Server): void {
  server.on('connection', (socket) => {
    const player: IPlayer = {
      id: uuid(),
      socketId: socket.id,
    };

    players.push(player);

    // console.log('user connected:', player.id);

    socket.emit('connected', player);

    socket.on('join', (body: IWSJoin) => {
      const table = sitToTable(body.tableId, player.id);
      socket.emit('table', getTableForClient(table, player.id));

      socket.join(body.tableId);
      socket.broadcast.to(body.tableId).emit('new-player', getPlayerForClient(player, null));
    });

    socket.on('start', (body: IWSStart) => {
      const table = tables.find(t => t.id === body.tableId);

      if (table.players.find(p => p.id === player.id).isLeader) {
        initPlayers(table.players);
        dealCards(table);

        server.to(body.tableId).clients((err, socketIds) => {
          for (const socketId of socketIds) {
            const socketPlayer = table.players.find(p => p.socketId === socketId);

            server.to(socketId).emit('game-start', getTableForClient(table, socketPlayer.id));
          }
        });
      }
    });

    socket.on('disconnect', () => {
      // console.log('user disconnected', player.id);
    });
  });
}
