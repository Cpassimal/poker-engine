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

export async function dispatchToTable(
  server: Server,
  table: ITable,
): Promise<void> {
  await new Promise((res) => {
    server.to(table.id).clients((err, socketIds) => {
      for (const socketId of socketIds) {
        const socketPlayer = table.players.find(p => p.socketId === socketId);

        server.to(socketId).emit(Events.Table, getTableForClient(table, socketPlayer.id));
      }

      res();
    });
  });

  await tick(table.speed);
}

export async function tick(
  speed: number,
): Promise<void> {
  return new Promise((res, rej) => {
    setTimeout(res, 1000 / speed);
  });
}

export async function handleEndGame(
  server: Server,
  table: ITable,
): Promise<void> {
  distributePot(table);
  initTable(table);
  initPlayers(table, false);
  dealCards(table);

  await dispatchToTable(server, table);
}

export async function handleStreetEnd(
  server: Server,
  table: ITable,
): Promise<void> {
  cleanPlayersAfterStreet(table.players);
  // send players state to players
  await dispatchToTable(server, table);

  if (table.street === Street.River || table.players.filter(p => !p.hasFolded).length === 1) {
    // players agreed on bets on river
    // or only one player did not fold
    // just handle game end
    await handleEndGame(server, table);
  } else {
    // river was not dealt yet and at least 2 players still play
    // deal new street and send new state
    initStreet(table);
    await dispatchToTable(server, table);

    if (!table.players.some(p => p.isTurn)) {
      // no player input needed (all active player are all in)
      // game will continue automatically
      return handleStreetEnd(server, table);
    }
  }
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

    socket.on(Events.Start, async (body: IWSStart) => {
      const table = tables.find(t => t.id === body.tableId);

      if (table.players.find(p => p.id === player.id).isLeader) {
        initPlayers(table, true);
        dealCards(table);

        await dispatchToTable(server, table);
      }
    });

    socket.on(Events.Play, async (body: IWSPlay) => {
      const table = tables.find(t => t.id === body.tableId);

      if (
        table.players.find(p => p.id === player.id).isTurn
        && player.availableDecisions.includes(body.play.decision)
      ) {
        executePlay(table, player, body.play);
        const nextPlayer = calculateIsTurn(table, player);

        if (!nextPlayer) {
          return handleStreetEnd(server, table);
        }

        return await dispatchToTable(server, table);
      }
    });

    socket.on(Events.Disconnect, () => {
      // console.log('user disconnected', player.id);
    });
  });
}
