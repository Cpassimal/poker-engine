import {
  CardColor,
  cardMap,
  ICard,
  IPlayer,
} from './interfaces';

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

export function dealCards(players: IPlayer[], deck: ICard[]): void {
  for (const player of players) {
    player.cards = [
      pickCard(deck),
      pickCard(deck),
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
