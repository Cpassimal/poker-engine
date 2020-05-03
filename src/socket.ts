import { v4 as uuid } from 'uuid';

import { Server } from 'socket.io';
import { players, tables } from './tools/data';
import { IPlay, IPlayer } from './tools/interfaces';
import { initPlayers, executePlay, sitToTable, calculateIsTurn } from './game/game';
import { dealCards, getPlayerForClient, getTableForClient, initStreet } from './tools/helper';

export enum Events {
  Connection = 'connection',
  Connected = 'connected',
  Disconnect = 'disconnect',
  Join = 'join',
  Table = 'table',
  NewPlayer = 'new-table',
  Start = 'start',
  GameStart = 'game-start',
  Play = 'play',
}

export interface IWSJoin {
  tableId: string;
}

export interface IWSStart {
  tableId: string;
  player: IPlayer;
}

export interface IWSPlay {
  tableId: string;
  player: IPlayer;
  play: IPlay;
}

export function initSocket(server: Server): void {
  server.on(Events.Connection, (socket) => {
    const player: IPlayer = {
      id: uuid(),
      socketId: socket.id,
    };

    players.push(player);

    socket.emit(Events.Connected, player);

    socket.on(Events.Join, (body: IWSJoin) => {
      const table = sitToTable(body.tableId, player.id);
      socket.emit(Events.Table, getTableForClient(table, player.id));

      socket.join(body.tableId);
      socket.broadcast.to(body.tableId).emit(Events.NewPlayer, getPlayerForClient(player, null));
    });

    socket.on(Events.Start, (body: IWSStart) => {
      const table = tables.find(t => t.id === body.tableId);

      if (table.players.find(p => p.id === player.id).isLeader) {
        initPlayers(table);
        dealCards(table);

        server.to(body.tableId).clients((err, socketIds) => {
          for (const socketId of socketIds) {
            const socketPlayer = table.players.find(p => p.socketId === socketId);

            server.to(socketId).emit(Events.GameStart, getTableForClient(table, socketPlayer.id));
          }
        });
      }
    });

    socket.on(Events.Play, (body: IWSPlay) => {
      const table = tables.find(t => t.id === body.tableId);

      if (
        table.players.find(p => p.id === player.id).isTurn
        && player.availableDecisions.includes(body.play.decision)
      ) {
        executePlay(table, player, body.play);
        const nextPlayer = calculateIsTurn(table, player);

        if (!nextPlayer) {
          const mustStop = initStreet(table);

          if (mustStop) {
            console.log('MUST STOP HIT');
          }
        }

        server.to(body.tableId).clients((err, socketIds) => {
          for (const socketId of socketIds) {
            const socketPlayer = table.players.find(p => p.socketId === socketId);

            server.to(socketId).emit(Events.Table, getTableForClient(table, socketPlayer.id));
          }
        });
      }
    });

    socket.on(Events.Disconnect, () => {
      // console.log('user disconnected', player.id);
    });
  });
}
