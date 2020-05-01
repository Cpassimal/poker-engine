import { IBoard, IPlayer, ITable } from './interfaces';

export const tables: ITable[] = [];

export const initialBank = 1000;

export const emptyBoard: IBoard = {
  flop1: null,
  flop2: null,
  flop3: null,
  turn: null,
  river: null,
  pot: null,
  sb: null,
  bb: null,
};

export const player1: IPlayer = {
  id: '1',
  name: 'player1',
  bank: initialBank,
  cards: [],
  isAllIn: false,
  inPotAmount: 0,
  inStreetAmount: 0,
  position: 1,
}

export const player2: IPlayer = {
  id: '2',
  name: 'player2',
  bank: initialBank,
  cards: [],
  isAllIn: false,
  inPotAmount: 0,
  inStreetAmount: 0,
  position: 2,
}

export const player3: IPlayer = {
  id: '3',
  name: 'player3',
  bank: initialBank,
  cards: [],
  isAllIn: false,
  inPotAmount: 0,
  inStreetAmount: 0,
  position: 3,
}

export const player4: IPlayer = {
  id: '4',
  name: 'player4',
  bank: initialBank,
  cards: [],
  isAllIn: false,
  inPotAmount: 0,
  inStreetAmount: 0,
  position: 4,
}
