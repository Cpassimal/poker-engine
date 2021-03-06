import { v4 as uuid } from 'uuid';

import { IPlay, IPlayer, ITable, ITableOptions } from '../tools/interfaces';
import { getInitialDeck, getNewPosition } from '../tools/helper';

import { emptyBoard, tables, players } from '../tools/data';

export function initPlayers(players: IPlayer[]): void {
  for (const player of players) {
    player.cards = [];
    player.isAllIn = false;
    player.inPotAmount = 0;
    player.inStreetAmount = 0;
    player.hasFolded = false;
    player.position = getNewPosition(player, players.length);
    player.isTurn = player.position === 1;
  }

  players.sort((p1, p2) => p2.position < p1.position ? 1 : -1);
}

export function createTable(
  options: ITableOptions,
): ITable {
  const id = uuid();

  return {
    id,
    options,
    deck: getInitialDeck(),
    players: [],
    logs: [],
  }
}

export function makePlay(play: IPlay): void {

}

export function sitToTable(
  tableId: string,
  playerId: string,
): ITable {
  const table = tables.find(t => t.id === tableId);

  if (!table) {
    throw new Error('Table not found');
  }

  const player = players.find(p => p.id === playerId);

  if (!player) {
    throw new Error('Player not found');
  }

  if (table.players.length === 0) {
    player.isLeader = true;
  }

  table.players.push(player);

  return table;
}
