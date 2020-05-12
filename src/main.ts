import { orderBy, sumBy } from 'lodash';
import * as assert from 'assert';

import {
  bet,
  cleanPlayersAfterStreet,
  dealCards, distributePot,
  getCardLabel,
  getInitialDeck,
  getPlayerLabel,
  pickCard,
  randomInt,
  setInitiative,
} from './tools/helper';
import {
  Decision,
  IBoard,
  ICard,
  IHand,
  IPlayer, ITable,
  ITurnEnd,
} from './tools/interfaces';
import { emptyBoard, initialBank, player1, player2, player3, player4 } from './tools/data';
import { calculatePots } from './tools/pots';
import { calculateHand, compareHands } from './tools/hands';
import { initPlayers } from './game/game';

let players = [player1, player2, player3, player4];

export function initGame(
  reset: boolean = false
): IPlayer[] {
  if (reset) {
    players = [player1, player2, player3, player4].map(p => ({
      ...p,
      bank: initialBank,
    }));
  }

  console.log('---------- START ----------');

  const deck = getInitialDeck();
  const board = {
    ...emptyBoard,
    pot: 0,
    sb: 10,
    bb: 20,
  };

  /**
   * init round
   */
  const currentDeck = [...deck];

  initPlayers(players);

  players.sort((p1, p2) => p2.position < p1.position ? 1 : -1);

  dealCards(players, currentDeck);

  /**
   * PRE-FLOP
   */
  console.log('--- PRE-FLOP ---');

  playStreet(board, players, true);

  console.log('POT: ', board.pot);

  /**
   * FLOP
   */
  if (players.filter(p => !p.hasFolded).length > 1) {
    board.flop1 = pickCard(currentDeck);
    board.flop2 = pickCard(currentDeck);
    board.flop3 = pickCard(currentDeck);

    console.log('--- FLOP ---', `${getCardLabel(board.flop1)} | ${getCardLabel(board.flop2)} | ${getCardLabel(board.flop3)}`);

    if (players.filter(p => !p.hasFolded && !p.isAllIn).length > 1) {
      playStreet(board, players);
    }

    console.log('POT: ', board.pot);
  }
  /**
   * TURN
   */
  if (players.filter(p => !p.hasFolded).length > 1) {
    board.turn = pickCard(currentDeck);

    console.log('--- TURN ---', `${getCardLabel(board.turn)}`);

    if (players.filter(p => !p.hasFolded && !p.isAllIn).length > 1) {
      playStreet(board, players);
    }

    console.log('POT: ', board.pot);
  }
  /**
   * RIVER
   */
  if (players.filter(p => !p.hasFolded).length > 1) {
    board.river = pickCard(currentDeck);

    console.log('--- RIVER ---', `${getCardLabel(board.river)}`);

    if (players.filter(p => !p.hasFolded && !p.isAllIn).length > 1) {
      playStreet(board, players);
    }
  }

  /**
   * END
   */
  console.log('POT: ', board.pot);
  console.log('FINAL BOARD');
  console.table(Object.keys(board).filter(key => board[key] && board[key].rank).map(key => getCardLabel(board[key])));

  players = endGame(players, board);

  return players;
}

function endGame(
  players: IPlayer[],
  board?: IBoard,
): IPlayer[] {
  distributePot(players, board)

  console.table(
    players.map(p => ({
      name: p.name,
      bank: p.bank,
    })),
  );
  console.log('---------- END ----------');

  return players.filter(p => p.bank > 0);
}

export function playStreet(
  board: IBoard,
  players: IPlayer[],
  isPreflop: boolean = false,
): void {
  let asked = 0;
  let turnNumber = 0;

  do {
    const endTurn = playTurn(
      board,
      players,
      isPreflop,
      turnNumber,
      asked,
    );

    asked = endTurn.asked;

    if (endTurn.stop) {
      cleanPlayersAfterStreet(players);

      return;
    }

    turnNumber++;

    if (turnNumber === 1000) {
      throw new Error('You fucked up your while loop');
    }
  } while (
    players.filter(p => p.hasFolded).length < players.length - 1
    && players.filter(p => p.isAllIn).length < players.length
    && !players.filter(p => !p.hasFolded).every(p => p.inStreetAmount === asked || p.isAllIn)
  );

  cleanPlayersAfterStreet(players);
}

export function playTurn(
  board: IBoard,
  players: IPlayer[],
  isPreflop: boolean,
  turnNumber: number,
  asked: number,
): ITurnEnd {
  for (const player of players) {
    let endAfterCheckOrFold = false;

    if (player.hasFolded) {
      continue;
    }

    if (players.every(p => p.id === player.id || p.hasFolded || p.isAllIn) && asked <= player.inStreetAmount) {
      return { asked, stop: true };
    }

    const isBBOnFirstTurn = player.position === 2 && turnNumber === 1;

    if (isPreflop && isBBOnFirstTurn && player.hasInitiative) {
      endAfterCheckOrFold = true;
    } else if (player.hasInitiative || players.every(p => p.id === player.id || p.hasFolded)) {
      return { asked, stop: true };
    }

    if (player.isAllIn) {
      continue;
    }

    let availableDecisions: Decision[] = [];

    if (asked === 0) {
      availableDecisions = [Decision.Check];

      if (!player.isAllIn) {
        availableDecisions.push(Decision.Bet);
      }
    } else if (asked > player.inStreetAmount) {
      availableDecisions = [Decision.Call];

      if (player.bank > (asked - player.inStreetAmount)) {
        availableDecisions.push(Decision.Raise);
      }
    } else if (asked === player.inStreetAmount) {
      availableDecisions = [
        Decision.Check,
        Decision.Raise,
      ];
    }

    availableDecisions.push(Decision.Fold);

    if (isPreflop && turnNumber === 0 && [1, 2].includes(player.position)) {
      availableDecisions = [Decision.Bet];
    }

    const decision: Decision = availableDecisions.length > 1
      ? availableDecisions[randomInt(0, availableDecisions.length - 1)]
      : availableDecisions[0];

    switch (decision) {
      case Decision.Bet: {
        let betValue = board.bb;

        if (isPreflop && turnNumber === 0 && player.position === 1) {
          betValue = board.sb;
        }

        asked = bet(player, betValue);

        console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, ${betValue} (in street pot: ${player.inStreetAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

        break;
      }
      case Decision.Call: {
        const betValue = bet(player, asked - player.inStreetAmount);

        console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, ${betValue} (in street pot: ${player.inStreetAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

        break;
      }
      case Decision.Fold: {
        player.hasFolded = true;

        console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, (in street pot: ${player.inStreetAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

        break;
      }
      case Decision.Raise: {
        const raiseValue = asked * 3;
        const betValue = bet(player, raiseValue);
        asked = player.inStreetAmount;
        setInitiative(players, player);

        console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, ${betValue} (in street pot: ${player.inStreetAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

        break;
      }
      case Decision.Check: {
        console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, (in street pot: ${player.inStreetAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

        break;
      }
    }

    if (endAfterCheckOrFold && [Decision.Check, Decision.Fold].includes(decision)) {
      return { asked, stop: true };
    }
  }

  return { asked, stop: false };
}
