export enum CardColor {
  Clubs = 1,
  Diamonds = 2,
  Hearts = 3,
  Spades = 4,
}

export enum Decision {
  Bet = 1,
  Call = 2,
  Check = 3,
  Fold = 4,
  Raise = 5,
}

export enum HandType {
  RoyalFlush = 10,
  StraightFlush = 9,
  FourOfAKind = 8,
  FullHouse = 7,
  Flush = 6,
  Straight = 5,
  ThreeOfAKind = 4,
  TwoPair = 3,
  OnePair = 2,
  HighCard = 1,
}

export enum Street {
  PreFlop = 1,
  Flop = 2,
  Turn = 3,
  River = 4,
}

export interface IHand {
  id?: string;
  playerId?: string;
  type?: HandType;
  fullHand?: ICard[];
  height?: number;
  height2?: number;
  kicker1?: ICard;
  kicker2?: ICard;
  kicker3?: ICard;
  kicker4?: ICard;
}

export const cardMap: Map<number, string> = new Map([
  [2, 'two'],
  [3, 'three'],
  [4, 'four'],
  [5, 'five'],
  [6, 'six'],
  [7, 'seven'],
  [8, 'eight'],
  [9, 'nine'],
  [10, 'ten'],
  [11, 'jack'],
  [12, 'queen'],
  [13, 'king'],
  [14, 'ace'],
]);

export interface ICard {
  rank: number;
  color: CardColor;
}

export interface IPlayer {
  id: string;
  availableDecisions?: Decision[];
  bank?: number;
  cards?: ICard[];
  hand?: IHand;
  hasFolded?: boolean;
  hadInitiative?: boolean;
  hasInitiative?: boolean;
  inPotAmount?: number;
  inStreetAmount?: number;
  isAllIn?: boolean;
  isLeader?: boolean;
  isTurn?: boolean;
  name?: string;
  position?: number;
  socketId?: string;
  lastDecision?: Decision;
}

export interface IUser {
  id: string;
  name?: string;
}

export interface IPlay {
  decision: Decision;
  value?: number;
}

export interface IBoard {
  flop1: ICard;
  flop2: ICard;
  flop3: ICard;
  turn: ICard;
  river: ICard;
}

export interface IPot {
  amount: number;
  size: number;
  playerIds: string[];
}

export interface ITurnEnd {
  asked: number;
  stop: boolean;
}

export interface ITable {
  id: string;
  asked?: number;
  isPreFlopSecondTurn?: boolean;
  hasPreFlopSecondTurnPassed?: boolean;
  board?: IBoard;
  players?: IPlayer[];
  logs?: string[];
  deck?: ICard[];
  options?: ITableOptions;
  street?: Street;
  speed?: number;
}

export interface ITableOptions {
  sb: number;
  timer?: number;
  initBank: number;
}
