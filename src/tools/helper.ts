import { CardColor, cardMap, Decision, ICard, IPlayer, ITable, Street } from './interfaces';
import { getAvailableDecisions } from '../game/game';

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
    turnNumber: table.turnNumber,
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
}

export function cleanPlayersAfterStreet(
  players: IPlayer[],
): void {
  for (const player of players) {
    player.inPotAmount += player.inStreetAmount;
    player.inStreetAmount = 0;
    player.hasInitiative = false;
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

export function initStreet(table: ITable): boolean {
  table.street = getNextStreet(table);
  table.turnNumber = 0;

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

  if (activePlayers.length > 1) {
    const firstPlayerToTalk = activePlayers[0];

    setIsTurn(table, firstPlayerToTalk);

    return false;
  }

  return true;
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
