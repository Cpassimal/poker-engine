import { CardColor, cardMap, Decision, IBoard, ICard, IHand, IPlayer, ITable, Street } from './interfaces';
import { getAvailableDecisions } from '../game/game';
import { orderBy, sumBy } from 'lodash';
import assert from "assert";
import { calculatePots } from './pots';
import { calculateHand, compareHands } from './hands';

export function randomInt(min: number = 0, max: number = 100) {
  if (
    max < min
    || max < 0
    || min < 0
  ) {
    throw new Error('invalid inputs')
  }

  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randomSign(): 1 | -1 {
  return Math.random() > 0.5 ? 1 : -1;
}

export function avg<T>(arr: T[], key: keyof T): number {
  return arr.reduce((sum, r) => sum + +r[key], 0) / arr.length;
}

export function max<T>(arr: T[], key: keyof T): number {
  return Math.max(...arr.map(r => +r[key]));
}

export function min<T>(arr: T[], key: keyof T): number {
  return Math.min(...arr.map(r => +r[key]));
}

export function getInitialDeck(): ICard[] {
  const deck: ICard[] = [];

  for (let i = 2; i <= 14; i++) {
    for (let j = 1; j <= 4; j++) {
      deck.push({
        color: j,
        rank: i,
      });
    }
  }

  return deck;
}

export function pickCard(deck: ICard[]): ICard {
  const pickedCardIndex = randomInt(0, deck.length - 1);
  const pickedCard = deck[pickedCardIndex];

  deck.splice(pickedCardIndex, 1);

  return pickedCard;
}

export function dealCards(table: ITable): void {
  for (const player of table.players) {
    player.cards = [
      pickCard(table.deck),
      pickCard(table.deck),
    ];
  }
}

export function getNewPosition(player: IPlayer, nbrOfPlayers: number): number {
  if (player.position === nbrOfPlayers) {
    return 1;
  } else {
    return player.position + 1;
  }
}

export function setInitiative(players: IPlayer[], player: IPlayer): void {
  for (const p of players) {
    p.hasInitiative = false;
  }

  player.hasInitiative = true;
}

export function getCardLabel(c: ICard): string {
  return `${cardMap.get(c.rank)}_${CardColor[c.color]}`;
}

export function getPlayerLabel(player: IPlayer, nbrPlayers: number): string {
  let positionLabel: string;

  if (nbrPlayers > 3) {
    switch (player.position) {
      case 1:
        positionLabel = 'sb';

        break;
      case 2:
        positionLabel = 'bb';

        break;
      case 3:
        positionLabel = 'utg';

        break;
      case nbrPlayers:
        positionLabel = 'bouton';

        break;
    }
  }

  return `${player.name} (${positionLabel})`;
}

export function getTableForClient(table: ITable, playerId: string): ITable {
  return {
    id: table.id,
    board: table.board,
    players: table.players.map(p => getPlayerForClient(p, playerId)),
    options: table.options,
    asked: table.asked,
    isPreFlopSecondTurn: table.isPreFlopSecondTurn,
    hasPreFlopSecondTurnPassed: table.hasPreFlopSecondTurnPassed,
    street: table.street,
  };
}

export function getPlayerForClient(player: IPlayer, playerId: string): IPlayer {
  return {
    id: player.id,
    name: player.name,
    bank: player.bank,
    inPotAmount: player.inPotAmount,
    inStreetAmount: player.inStreetAmount,
    position: player.position,
    hasFolded: player.hasFolded,
    isAllIn: player.isAllIn,
    hasInitiative: player.hasInitiative,
    isLeader: player.isLeader,
    isTurn: player.isTurn,
    cards: player.id === playerId ? player.cards : [],
    availableDecisions: player.availableDecisions,
  };
}

export function logDecision(
  table: ITable,
  player:IPlayer,
  decision: Decision,
  betValue: number,
): void {
  if (betValue) {
    console.log(`${getPlayerLabel(player, table.players.length)}: ${Decision[decision]}s, ${betValue} (in street pot: ${player.inStreetAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);
  } else {
    console.log(`${getPlayerLabel(player, table.players.length)}: ${Decision[decision]}s, (in street pot: ${player.inStreetAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);
  }
}

export function getNextPlayer(
  players: IPlayer[],
  currentPlayer: IPlayer,
): IPlayer {
  const activePlayers = players
  .filter(p => !p.isAllIn && !p.hasFolded && p.id !== currentPlayer.id)
  .sort((p1, p2) => p1.position - p2.position);

  const nextPlayer = activePlayers.find(p => p.position > currentPlayer.position);

  if (nextPlayer) {
    return nextPlayer;
  }

  return activePlayers[0];
}

export function setIsTurn(
  table: ITable,
  nextPlayer: IPlayer,
): void {
  for (const player of table.players) {
    player.isTurn = false;
    player.availableDecisions = [];
  }

  nextPlayer.isTurn = true;
  nextPlayer.availableDecisions = getAvailableDecisions(table, nextPlayer);

  // console.log(nextPlayer);
}

export function cleanPlayersAfterStreet(
  players: IPlayer[],
): void {
  for (const player of players) {
    player.inPotAmount += player.inStreetAmount;
    player.inStreetAmount = 0;
    player.hasInitiative = false;
    player.availableDecisions = [];
  }
}

export function getNextStreet(table: ITable): Street {
  switch (table.street) {
    case Street.PreFlop:
      return Street.Flop;
    case Street.Flop:
      return Street.Turn;
    case Street.Turn:
      return Street.River;
    case Street.River:
      return Street.PreFlop;
  }
}

export function initStreet(table: ITable): void {
  table.street = getNextStreet(table);
  table.asked = 0;
  table.isPreFlopSecondTurn = false;

  cleanPlayersAfterStreet(table.players);

  switch (table.street) {
    case Street.Flop:
      table.board.flop1 = pickCard(table.deck);
      table.board.flop2 = pickCard(table.deck);
      table.board.flop3 = pickCard(table.deck);

      break;
    case Street.Turn:
      table.board.turn = pickCard(table.deck);

      break;
    case Street.River:
      table.board.river = pickCard(table.deck);

      break;
  }

  const activePlayers = table.players
  .filter(p => !p.isAllIn && !p.hasFolded)
  .sort((p1, p2) => p1.position - p2.position);

  const firstPlayerToTalk = activePlayers[0];

  setIsTurn(table, firstPlayerToTalk);
}

export function bet(
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

  player.bank -= betValue;
  player.inStreetAmount += betValue;

  return betValue;
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
  table: ITable,
): void {
  distributionWrapper(table.players, () => {
    const pots = calculatePots(table.players);
    const handGroups = getWinnersOrder(table.players, table.board);

    for (const pot of pots) {
      const potWinnerGroup = handGroups.find(hg => hg.some(h => pot.playerIds.includes(h.playerId)));
      const potWinners = potWinnerGroup.filter(h => pot.playerIds.includes(h.playerId));

      const share = Math.round(pot.amount / potWinners.length);
      let distributed = 0;

      for (const potWinner of potWinners) {
        const player = table.players.find(p => p.id === potWinner.playerId);
        player.bank += share;
        distributed += share;
      }

      // because of rounding, distributed could be !== as pot amount
      const delta = pot.amount - distributed;

      if (delta) {
        const potWinnerPlayers = potWinners.map(pw => table.players.find(p => p.id === pw.playerId));

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

    for (const player of table.players) {
      player.inPotAmount = 0;
    }
  });
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

