import { IPlayer } from './interfaces';
import { getNextPlayer } from './helper';

describe('getNextPlayer', () => {
  let players: IPlayer[];

  describe('all players are active', () => {
    beforeEach(() => {
      players = [
        {
          id: '1',
          position: 1,
          isAllIn: false,
          hasFolded: false,
        },
        {
          id: '2',
          position: 2,
          isAllIn: false,
          hasFolded: false,
        },
        {
          id: '3',
          position: 3,
          isAllIn: false,
          hasFolded: false,
        },
        {
          id: '4',
          position: 4,
          isAllIn: false,
          hasFolded: false,
        },
      ];
    });

    describe('current in position 1', () => {
      it('should return player in position 2', () => {
        const currentPlayer = players.find(p => p.id === '1');
        const nextPlayer = getNextPlayer(players, currentPlayer);

        expect(nextPlayer).toBeDefined();
        expect(nextPlayer.id).toBe('2');
        expect(nextPlayer.position).toBe(2);
      });
    });

    describe('current in position 2', () => {
      it('should return player in position 3', () => {
        const currentPlayer = players.find(p => p.id === '2');
        const nextPlayer = getNextPlayer(players, currentPlayer);

        expect(nextPlayer).toBeDefined();
        expect(nextPlayer.id).toBe('3');
        expect(nextPlayer.position).toBe(3);
      });
    });

    describe('current in position 4', () => {
      it('should return player in position 1', () => {
        const currentPlayer = players.find(p => p.id === '4');
        const nextPlayer = getNextPlayer(players, currentPlayer);

        expect(nextPlayer).toBeDefined();
        expect(nextPlayer.id).toBe('1');
        expect(nextPlayer.position).toBe(1);
      });
    });
  });

  describe('6 players, all are active except 1 and 5', () => {
    beforeEach(() => {
      players = [
        {
          id: '1',
          position: 1,
          isAllIn: true,
          hasFolded: false,
        },
        {
          id: '2',
          position: 2,
          isAllIn: false,
          hasFolded: false,
        },
        {
          id: '3',
          position: 3,
          isAllIn: false,
          hasFolded: false,
        },
        {
          id: '4',
          position: 4,
          isAllIn: false,
          hasFolded: false,
        },
        {
          id: '5',
          position: 5,
          isAllIn: true,
          hasFolded: false,
        },
        {
          id: '6',
          position: 6,
          isAllIn: false,
          hasFolded: false,
        },
      ];
    });

    describe('current in position 3', () => {
      it('should return player in position 4', () => {
        const currentPlayer = players.find(p => p.id === '3');
        const nextPlayer = getNextPlayer(players, currentPlayer);

        expect(nextPlayer).toBeDefined();
        expect(nextPlayer.id).toBe('4');
        expect(nextPlayer.position).toBe(4);
      });
    });

    describe('current in position 4', () => {
      it('should return player in position 6', () => {
        const currentPlayer = players.find(p => p.id === '4');
        const nextPlayer = getNextPlayer(players, currentPlayer);

        expect(nextPlayer).toBeDefined();
        expect(nextPlayer.id).toBe('6');
        expect(nextPlayer.position).toBe(6);
      });
    });

    describe('current in position 6', () => {
      it('should return player in position 2', () => {
        const currentPlayer = players.find(p => p.id === '6');
        const nextPlayer = getNextPlayer(players, currentPlayer);

        expect(nextPlayer).toBeDefined();
        expect(nextPlayer.id).toBe('2');
        expect(nextPlayer.position).toBe(2);
      });
    });
  });

  describe('all players folded except one', () => {
  });
});
