import { IPlayer } from './interfaces';

const initialBank = 1000;

export const player1: IPlayer = {
  id: 1,
  name: 'player1',
  bank: initialBank,
  cards: [],
  isAllIn: false,
  inPotAmount: 0,
  inRoundAmount: 0,
  position: 1,
}

export const player2: IPlayer = {
  id: 2,
  name: 'player2',
  bank: initialBank,
  cards: [],
  isAllIn: false,
  inPotAmount: 0,
  inRoundAmount: 0,
  position: 2,
}

export const player3: IPlayer = {
  id: 3,
  name: 'player3',
  bank: initialBank,
  cards: [],
  isAllIn: false,
  inPotAmount: 0,
  inRoundAmount: 0,
  position: 3,
}

export const player4: IPlayer = {
  id: 4,
  name: 'player4',
  bank: initialBank,
  cards: [],
  isAllIn: false,
  inPotAmount: 0,
  inRoundAmount: 0,
  position: 4,
}