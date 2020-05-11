import { CardColor, IBoard, ICard, IPlayer } from './tools/interfaces';
import { distributePot, getWinnersOrder, initGame, playStreet } from './main';
import { emptyBoard } from './tools/data';

export const getColor = (str: string): CardColor => {
  switch (str) {
    case 'S':
      return CardColor.Spades;
    case 'C':
      return CardColor.Clubs;
    case 'H':
      return CardColor.Hearts;
    case 'D':
      return CardColor.Diamonds;
  }
};

export const getCard = (designation: string): ICard => {
  const [color, rank] = designation.split('_');

  return {
    color: getColor(color),
    rank: +rank,
  };
};

export const getCards = (designations: string[]): ICard[] => designations.map(getCard);

xdescribe('initGame', () => {
  it('should return true', () => {
    let ret: IPlayer[] = null;

    for (let i = 0; i < 10000000; i++) {
      while (!ret || ret.length > 1) {
        ret = initGame(!ret || ret.length < 2);

        if (ret.length === 1) {
          ret = null;
        }
      }
    }

    expect(true).toBe(true);
  });
});

xdescribe('initGame', () => {
  it('should return true', () => {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        initGame(j === 0);
      }
    }

    expect(true).toBe(true);
  });
});

xdescribe('playStreet', () => {
  it('should stops if players cannot continue betting', () => {
    const basePlayer: IPlayer = {
      id: null,
      hasFolded: false,
      isAllIn: false,
      inPotAmount: 0,
      inStreetAmount: 0,
    };
    emptyBoard.sb = 10;
    emptyBoard.bb = 20;
    emptyBoard.pot = 0;

    const players: IPlayer[] = [
      {
        ...basePlayer,
        id: '1',
        name: 'player1',
        bank: emptyBoard.sb,
        position: 1,
      },
      {
        ...basePlayer,
        id: '2',
        name: 'player2',
        bank: 1,
        position: 2,
      },
    ];

    playStreet(
      emptyBoard,
      players,
      true,
    );

    for (const player of players) {
      expect(player.isAllIn).toBe(true);
    }
  });
});
