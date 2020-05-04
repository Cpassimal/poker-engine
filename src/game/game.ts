import { v4 as uuid } from 'uuid';

import { Decision, IPlay, IPlayer, ITable, ITableOptions, Street } from '../tools/interfaces';
import { bet, getInitialDeck, getNewPosition, getNextPlayer, logDecision, setInitiative, setIsTurn } from '../tools/helper';

import { emptyBoard, players, tables } from '../tools/data';

export function initPlayers(table: ITable, first: boolean): void {
  for (const player of table.players) {
    player.cards = [];
    player.isAllIn = false;
    player.inPotAmount = 0;
    player.inStreetAmount = 0;
    player.hasFolded = false;
    player.hasInitiative = false;
    player.position = getNewPosition(player, table.players.length);
    player.isTurn = player.position === 1;
    player.availableDecisions = getAvailableDecisions(table, player);
    player.bank = first ? table.options.initBank : player.bank;
  }

  table.players.sort((p1, p2) => p2.position < p1.position ? 1 : -1);
}

export function initTable(table: ITable): void {
  table.deck = getInitialDeck();
  table.asked = 0;
  table.isPreFlopSecondTurn = false;
  table.hasPreFlopSecondTurnPassed = false;
  table.street = Street.PreFlop;
  table.board = emptyBoard;
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
    isPreFlopSecondTurn: false,
    hasPreFlopSecondTurnPassed: false,
    street: Street.PreFlop,
    board: emptyBoard,
  };
}

export function getAvailableDecisions(
  table: ITable,
  player: IPlayer,
): Decision[] {
  if (!player.isTurn) {
    return [];
  }

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

  if (table.street === Street.PreFlop && !table.hasPreFlopSecondTurnPassed && [1, 2].includes(player.position)) {
    availableDecisions = [Decision.Bet];
  }

  return availableDecisions;
}

export function calculateIsTurn(
  table: ITable,
  currentPlayer: IPlayer,
): IPlayer {
  // const canContinueStreet = table.players.filter(p => p.hasFolded).length < table.players.length - 1
  //   && table.players.filter(p => p.isAllIn).length < table.players.length
  //   && !table.players.filter(p => !p.hasFolded).every(p => p.inStreetAmount === table.asked || p.isAllIn);
  //
  // if (!canContinueStreet) {
  //   return null;
  // }

  const nextPlayer = getNextPlayer(table.players, currentPlayer);

  if (
    table.street === Street.PreFlop
    && nextPlayer.position === 1
    && !table.isPreFlopSecondTurn
    && !table.hasPreFlopSecondTurnPassed
  ) {
    table.isPreFlopSecondTurn = true;
    table.hasPreFlopSecondTurnPassed = true;
  }

  if (table.players.every(p => p.id === nextPlayer.id || p.hasFolded || p.isAllIn) && table.asked <= nextPlayer.inStreetAmount) {
    console.log(1);

    return null;
  }

  const isSBOnSecondTurn = table.isPreFlopSecondTurn && currentPlayer.position === 1;
  const isBBOnSecondTurn = table.isPreFlopSecondTurn && currentPlayer.position === 2;

  // end turn after bb checks or folds on preflop
  if (
    isBBOnSecondTurn
    && currentPlayer.hadInitiative
    && [Decision.Check, Decision.Fold].includes(currentPlayer.lastDecision)
  ) {
    return null;
  } else if (isBBOnSecondTurn) {
    table.isPreFlopSecondTurn = false;
  }

  // end turn if next player has initiative, EXCEPT for second turn so bb can talk
  if (
    !isSBOnSecondTurn
    && (nextPlayer.hasInitiative || table.players.every(p => p.id === nextPlayer.id || p.hasFolded))
  ) {
    return null;
  }

  setIsTurn(table, nextPlayer);

  return nextPlayer;
}

export function executePlay(
  table: ITable,
  player: IPlayer,
  play: IPlay,
): void {
  const decision = play.decision;

  player.hadInitiative = player.hasInitiative;

  switch (decision) {
    case Decision.Bet: {
      let betValue = 0;

      if (table.street === Street.PreFlop && !table.isPreFlopSecondTurn && player.position === 1) {
        betValue = table.options.sb;
      } else if (table.street === Street.PreFlop && !table.isPreFlopSecondTurn && player.position === 2) {
        betValue = table.options.sb * 2;
      } else {
        betValue = play.value >= table.options.sb * 2 ? play.value : table.options.sb * 2;
      }

      table.asked = bet(player, betValue);
      setInitiative(table.players, player);

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
