import { v4 as uuid } from 'uuid';

import { Decision, IPlay, IPlayer, ITable, ITableOptions, Street } from '../tools/interfaces';
import { bet, getInitialDeck, getNewPosition, getNextPlayer, logDecision, setInitiative, setIsTurn } from '../tools/helper';

import { players, tables } from '../tools/data';

export function initPlayers(table: ITable): void {
  for (const player of table.players) {
    player.cards = [];
    player.isAllIn = false;
    player.inPotAmount = 0;
    player.inStreetAmount = 0;
    player.hasFolded = false;
    player.position = getNewPosition(player, table.players.length);
    player.isTurn = player.position === 1;
    player.availableDecisions = getAvailableDecisions(table, player);
    player.bank = table.options.initBank;
  }

  table.players.sort((p1, p2) => p2.position < p1.position ? 1 : -1);
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
    asked: 0,
    turnNumber: 0,
    street: Street.PreFlop,
  }
}

export function getAvailableDecisions(
  table: ITable,
  player: IPlayer,
): Decision[] {
  let availableDecisions: Decision[] = [];

  if (table.asked === 0) {
    availableDecisions = [Decision.Check];

    if (!player.isAllIn) {
      availableDecisions.push(Decision.Bet);
    }
  } else if (table.asked > player.inStreetAmount) {
    availableDecisions = [Decision.Call];

    if (player.bank > (table.asked - player.inStreetAmount)) {
      availableDecisions.push(Decision.Raise);
    }
  } else if (table.asked === player.inStreetAmount) {
    availableDecisions = [Decision.Check, Decision.Raise];
  }

  availableDecisions.push(Decision.Fold);

  if (table.street === Street.PreFlop && table.turnNumber === 0 && [1, 2].includes(player.position)) {
    availableDecisions = [Decision.Bet];
  }

  return availableDecisions;
}

export function calculateIsTurn(
  table: ITable,
  currentPlayer: IPlayer,
): IPlayer {
  const canContinueStreet = table.players.filter(p => p.hasFolded).length < table.players.length - 1
    && table.players.filter(p => p.isAllIn).length < table.players.length
    && !table.players.filter(p => !p.hasFolded).every(p => p.inStreetAmount === table.asked || p.isAllIn);

  if (!canContinueStreet) {
    return null;
  }

  let endAfterCheckOrFold = false;

  if (table.players.every(p => p.id === currentPlayer.id || p.hasFolded || p.isAllIn) && table.asked <= currentPlayer.inStreetAmount) {
    return null;
  }

  const isBBOnFirstTurn = currentPlayer.position === 2 && table.turnNumber === 1;

  if (table.street === Street.PreFlop && isBBOnFirstTurn && currentPlayer.hasInitiative) {
    endAfterCheckOrFold = true;
  } else if (currentPlayer.hasInitiative || table.players.every(p => p.id === currentPlayer.id || p.hasFolded)) {
    return null;
  }

  if (endAfterCheckOrFold && [Decision.Check, Decision.Fold].includes(currentPlayer.lastDecision)) {
    return null;
  }

  const nextPlayer = getNextPlayer(table.players, currentPlayer);

  setIsTurn(table, nextPlayer);

  return nextPlayer;
}

export function executePlay(
  table: ITable,
  player: IPlayer,
  play: IPlay,
): void {
  const decision = play.decision;

  switch (decision) {
    case Decision.Bet: {
      let betValue = 0;

      if (table.street === Street.PreFlop && table.turnNumber === 0 && player.position === 1) {
        betValue = table.options.sb;
      } else if (table.street === Street.PreFlop && table.turnNumber === 0 && player.position === 2) {
        betValue = table.options.sb * 2;
      } else {
        betValue = play.value >= table.options.sb * 2 ? play.value : table.options.sb * 2;
      }

      table.asked = bet(player, betValue);

      logDecision(table, player, decision, betValue);

      break;
    }
    case Decision.Call: {
      const betValue = bet(player, table.asked - player.inStreetAmount);

      logDecision(table, player, decision, betValue);

      break;
    }
    case Decision.Fold: {
      player.hasFolded = true;

      logDecision(table, player, decision, null);

      break;
    }
    case Decision.Raise: {
      const raiseValue = play.value > table.asked ? play.value : table.asked + 1;
      const betValue = bet(player, raiseValue);
      table.asked = player.inStreetAmount;
      setInitiative(table.players, player);

      logDecision(table, player, decision, betValue);

      break;
    }
    case Decision.Check: {
      logDecision(table, player, decision, null);

      break;
    }
  }

  player.lastDecision = decision;
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
    player.position = 1;
  } else {
    player.position = Math.max(...table.players.map(p => p.position)) + 1;
  }

  table.players.push(player);

  return table;
}
