import { v4 as uuid } from 'uuid';

import { IPlay, IPlayer, ITable, ITableOptions } from '../tools/interfaces';
import { getInitialDeck, getNewPosition } from '../tools/helper';
import { emptyBoard } from '../tools/data';

function initPlayers(players: IPlayer[]): void {
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

export function initTable(
  players: IPlayer[],
  options: ITableOptions,
): ITable {
  const deck = getInitialDeck();
  const id = uuid();

  initPlayers(players);

  return {
    id,
    deck,
    players,
    board: { ...emptyBoard },
    logs: [],
    options,
  }
}

export function makePlay(play: IPlay): void {

}

export function sitToTable(gameId: string, playerId: string): ITable {
  return null;
}
