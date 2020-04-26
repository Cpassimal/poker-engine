import { orderBy, sumBy } from 'lodash';

import {
  calculateHand,
  calculatePots,
  compareHands,
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
import { player1, player2, player3, player4 } from './tools/data';

let pot = 0;
const sb = 10;
const bb = 2 * sb;
const emptyBoard: IBoard = {
  flop1: null,
  flop2: null,
  flop3: null,
  turn: null,
  river: null,
};

let players = [player1, player2, player3, player4];

export function initGame() {
  console.log('---------- START ----------');

  const deck = getInitialDeck();
  const board = { ...emptyBoard };

  /**
   * init round
   */
  const currentDeck = [...deck];
  pot = 0;

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

  playStreet(true);

  console.log('POT: ', pot);

  /**
   * FLOP
   */
  if (players.filter(p => !p.hasFolded).length > 1) {
    board.flop1 = pickCard(currentDeck);
    board.flop2 = pickCard(currentDeck);
    board.flop3 = pickCard(currentDeck);

    console.log('--- FLOP ---', `${getCardLabel(board.flop1)} | ${getCardLabel(board.flop2)} | ${getCardLabel(board.flop3)}`);

    playStreet();

    console.log('POT: ', pot);
  }
  /**
   * TURN
   */
  if (players.filter(p => !p.hasFolded).length > 1) {
    board.turn = pickCard(currentDeck);

    console.log('--- TURN ---', `${getCardLabel(board.turn)}`);

    playStreet();

    console.log('POT: ', pot);
  }
  /**
   * RIVER
   */
  if (players.filter(p => !p.hasFolded).length > 1) {
    board.river = pickCard(currentDeck);

    console.log('--- RIVER ---', `${getCardLabel(board.river)}`);

    playStreet();
  }

  /**
   * END
   */
  console.log('POT: ', pot);
  console.log('FINAL BOARD');
  console.table(Object.keys(board).filter(key => board[key]).map(key => getCardLabel(board[key])));

  endGame(board);
}

function endGame(
  board?: IBoard,
): void {
  distributePot(players, board)

  console.table(
    players.map(p => ({
      name: p.name,
      bank: p.bank,
    })),
  );
  console.log('---------- END ----------');

  players = players.filter(p => p.bank > 0);
}

function playStreet(
  isPreflop: boolean = false,
) {
  let asked = 0;
  let turnNumber = 0;

  do {
    const endTurn = playTurn(
      isPreflop,
      turnNumber,
      asked,
    );

    asked = endTurn.asked;

    if (endTurn.stop) {
      cleanPlayersAfterStreet();

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

  cleanPlayersAfterStreet();
}

function playTurn(
  isPreflop: boolean,
  turnNumber: number,
  asked: number,
): ITurnEnd {
  for (const player of players) {
    let endAfterCheckOrFold = false;

    if (player.hasFolded) {
      continue;
    }

    const isBBOnFirstTurn = player.position === 2 && !turnNumber;

    if (isPreflop && isBBOnFirstTurn) {
      endAfterCheckOrFold = true;
    } else if (player.hasInitiative || players.every(p => p.id === player.id || p.hasFolded)) {
      return { asked, stop: false };
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

    // availableDecisions.push(Decision.Fold);

    if (isPreflop && turnNumber === 0 && [1, 2].includes(player.position)) {
      availableDecisions = [Decision.Bet];
    }

    const decision: Decision = availableDecisions.length > 1
      ? availableDecisions[randomInt(0, availableDecisions.length - 1)]
      : availableDecisions[0];

    switch (decision) {
      case Decision.Bet: {
        let betValue = bb;

        if (isPreflop && turnNumber === 0 && player.position === 1) {
          betValue = sb;
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

function bet(
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

  pot += betValue;
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
  console.assert(player.inPotAmount >= 0);
  console.assert(player.bank >= 0);

  console.assert(player.inPotAmount === Math.round(player.inPotAmount));
  console.assert(player.bank === Math.round(player.bank));
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

  console.assert(totalInPotsAfter === 0);
  console.assert(totalBanksAfter === totalBanksBefore + totalInPotsBefore);

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

function cleanPlayersAfterStreet(): void {
  for (const player of players) {
    player.inPotAmount += player.inStreetAmount;
    player.inStreetAmount = 0;
    player.hasInitiative = false;
  }
}
