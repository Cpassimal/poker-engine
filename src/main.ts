import { orderBy, sumBy } from 'lodash';
import * as assert from 'assert';

import {
  dealCards,
  getCardLabel,
  getInitialDeck,
  getNewPosition,
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
  IPlayer,
  ITurnEnd
} from './tools/interfaces';
import { emptyBoard, initialBank, player1, player2, player3, player4 } from './tools/data';
import { calculatePots } from './tools/pots';
import { calculateHand, compareHands } from './tools/hands';

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

  for (const player of players) {
    player.cards = [];
    player.isAllIn = false;
    player.inPotAmount = 0;
    player.inStreetAmount = 0;
    player.hasFolded = false;
    player.position = getNewPosition(player, players.length);
  }

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

function playTurn(
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

        asked = bet(board, player, betValue);

        console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, ${betValue} (in street pot: ${player.inStreetAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

        break;
      }
      case Decision.Call: {
        const betValue = bet(board, player, asked - player.inStreetAmount);

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
        const betValue = bet(board, player, raiseValue);
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

function bet(
  board: IBoard,
  player: IPlayer,
  amount: number,
): number {
  let betValue: number;

  if (player.bank > amount) {
    betValue = amount;
  } else {
    betValue = player.bank;
    player.isAllIn = true;
  }

  board.pot += betValue;
  player.bank -= betValue;
  player.inStreetAmount += betValue;

  return betValue;
}

export function getWinnersOrder(
  players: IPlayer[],
  board: IBoard,
): IHand[][] {
  players = players.filter(p => !p.hasFolded);

  if (players.length === 1) {
    // only one player, natural winner
    // since he did not fold, he is part of every pots
    const player = players[0];

    return [
      [
        {
          playerId: player.id,
        }
      ]
    ]
  }

  if (!board) {
    throw new Error('A board is needed to get winners order with more than one player')
  }

  const boardCards: ICard[] = [board.flop1, board.flop2, board.flop3, board.turn, board.river];

  const hands: IHand[] = [];

  for (const player of players) {
    const hand = calculateHand([
      ...boardCards,
      ...player.cards,
    ]);

    hand.playerId = player.id;

    hand.id = [
      hand.type,
      hand.height,
      hand.height2,
      hand.kicker1?.rank,
      hand.kicker2?.rank,
      hand.kicker3?.rank,
      hand.kicker4?.rank,
    ]
    .map(h => h ? h : '-')
    .join('_');

    player.hand = hand;

    hands.push(hand);
  }

  const sortedHands = hands.sort(compareHands);

  const groupedHands: IHand[][] = [];

  for (const hand of sortedHands) {
    let group = groupedHands.find(hands => compareHands(hands[0], hand) === 0);

    if (!group) {
      group = [];
      groupedHands.push(group);
    }

    group.push(hand);
  }

  return groupedHands;
}

const assertPlayer = player => {
  assert(player.inPotAmount >= 0);
  assert(player.bank >= 0);

  assert(player.inPotAmount === Math.round(player.inPotAmount));
  assert(player.bank === Math.round(player.bank));
};

const distributionWrapper = (players: IPlayer[], distribute: Function) => {
  for (const player of players) {
    assertPlayer(player);
  }

  const totalBanksBefore = sumBy(players, p => p.bank);
  const totalInPotsBefore = sumBy(players, p => p.inPotAmount);

  distribute();

  const totalInPotsAfter = sumBy(players, p => p.inPotAmount);
  const totalBanksAfter = sumBy(players, p => p.bank);

  assert(totalInPotsAfter === 0);
  assert(totalBanksAfter === totalBanksBefore + totalInPotsBefore);

  for (const player of players) {
    assertPlayer(player);
  }
};

export function distributePot(
  players: IPlayer[],
  board: IBoard,
): void {
  distributionWrapper(players, () => {
    const pots = calculatePots(players);
    const handGroups = getWinnersOrder(players, board);

    for (const pot of pots) {
      const potWinnerGroup = handGroups.find(hg => hg.some(h => pot.playerIds.includes(h.playerId)));
      const potWinners = potWinnerGroup.filter(h => pot.playerIds.includes(h.playerId));

      const share = Math.round(pot.amount / potWinners.length);
      let distributed = 0;

      for (const potWinner of potWinners) {
        const player = players.find(p => p.id === potWinner.playerId);
        player.bank += share;
        distributed += share;
      }

      // because of rounding, distributed could be !== as pot amount
      const delta = pot.amount - distributed;

      if (delta) {
        const potWinnerPlayers = potWinners.map(pw => players.find(p => p.id === pw.playerId));

        // in order to have a consistent rule
        // if delta > 0 we adjust with lowest bank
        // if delta < 0 we adjust with the highest bank
        // in case of identical banks adjust with the highest id
        const playerToAdjust = orderBy(
          potWinnerPlayers,
          ['bank', 'id'],
          [delta > 0 ? 'desc' : 'desc', 'desc'],
        )[0];

        playerToAdjust.bank += delta;
      }
    }

    for (const player of players) {
      player.inPotAmount = 0;
    }
  });
}

function cleanPlayersAfterStreet(
  players: IPlayer[],
): void {
  for (const player of players) {
    player.inPotAmount += player.inStreetAmount;
    player.inStreetAmount = 0;
    player.hasInitiative = false;
  }
}
