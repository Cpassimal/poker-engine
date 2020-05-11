import { v4 as uuid } from 'uuid';

import { Server } from 'socket.io';
import { players, tables } from './tools/data';
import { IPlay, IPlayer, ITable, Street } from './tools/interfaces';
import { calculateIsTurn, executePlay, initPlayers, initTable, sitToTable } from './game/game';
import { cleanPlayersAfterStreet, dealCards, distributePot, getPlayerForClient, getTableForClient, initStreet } from './tools/helper';

export enum Events {
  Connection = 'connection',
  Connected = 'connected',
  Disconnect = 'disconnect',
  Join = 'join',
  Table = 'table',
  NewPlayer = 'new-table',
  Start = 'start',
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

export function dispatchToTable(
  server: Server,
  table: ITable,
): Promise<void> {
  return new Promise((res) => {
    server.to(table.id).clients((err, socketIds) => {
      for (const socketId of socketIds) {
        const socketPlayer = table.players.find(p => p.socketId === socketId);

        server.to(socketId).emit(Events.Table, getTableForClient(table, socketPlayer.id));
      }

      res();
    });
  });
}

export function initSocket(server: Server): void {
  server.on(Events.Connection, (socket) => {
    const playerId = uuid();

    const player: IPlayer = {
      id: playerId,
      socketId: socket.id,
      name: playerId.slice(0, 6),
    };

    players.push(player);

    socket.emit(Events.Connected, player);

    socket.on(Events.Join, (body: IWSJoin) => {
      const table = sitToTable(body.tableId, player.id);
      socket.emit(Events.Table, getTableForClient(table, player.id));

      socket.join(table.id);
      socket.broadcast.to(table.id).emit(Events.NewPlayer, getPlayerForClient(player, null));
    });

    socket.on(Events.Start, (body: IWSStart) => {
      const table = tables.find(t => t.id === body.tableId);

      if (table.players.find(p => p.id === player.id).isLeader) {
        initPlayers(table, true);
        dealCards(table);
        dispatchToTable(server, table);
      }
    });

    socket.on(Events.Play, async (body: IWSPlay) => {
      const table = tables.find(t => t.id === body.tableId);
      let mustEndGame: boolean = false;

      if (
        table.players.find(p => p.id === player.id).isTurn
        && player.availableDecisions.includes(body.play.decision)
      ) {
        executePlay(table, player, body.play);
        const nextPlayer = calculateIsTurn(table, player);

        if (!nextPlayer) {
          cleanPlayersAfterStreet(table.players);

          if (table.street === Street.River) {
            mustEndGame = true;
          } else {
            if (table.players.filter(p => !p.hasFolded).length > 1) {
              const waitForPlayerInput = initStreet(table);

              if (!waitForPlayerInput) {
                while (table.street !== Street.River) {
                  await dispatchToTable(server, table);

                  await new Promise((res) => {
                    setTimeout(async () => {
                      initStreet(table);

                      res();
                    }, 100);
                  });
                }

                mustEndGame = true;
              }
            } else {
              mustEndGame = true;
            }
          }
        }

        dispatchToTable(server, table);

        if (mustEndGame) {
          // to let the other one time to dispatch
          setTimeout(() => {
            distributePot(table);
            initTable(table);
            initPlayers(table, false);
            dealCards(table);

            dispatchToTable(server, table);
          }, 100);
        }
      }
    });

    socket.on(Events.Disconnect, () => {
      // console.log('user disconnected', player.id);
    });
  });
}
