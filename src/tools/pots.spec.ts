import { CardColor, IBoard, ICard, IPlayer, IPot } from './interfaces';
import { calculatePots } from './pots';
import { distributePot, getWinnersOrder } from './helper';

function expectPotSize(
  pots: IPot[],
): void {
  for (const pot of pots) {
    expect(pot.size).toBe(pot.amount / pot.playerIds.length);
  }
}

describe('calculatePots', () => {
  it('should calculate one pot with all players if no all-in', () => {
    const pots = calculatePots([
      {
        id: '1',
        inPotAmount: 1600,
      },
      {
        id: '2',
        inPotAmount: 1600,
      },
      {
        id: '3',
        inPotAmount: 1600,
      },
    ]);

    expect(pots.length).toBe(1);
    expectPotSize(pots);

    const p1 = pots.find(p => p.amount === 4800);

    expect(p1.playerIds).toEqual(['1', '2', '3']);
  })

  it('should calculate pots with one all-in', () => {
    const pots = calculatePots([
      {
        id: '1',
        inPotAmount: 1600,
      },
      {
        id: '2',
        inPotAmount: 400,
      },
      {
        id: '3',
        inPotAmount: 1600,
      },
    ]);

    expect(pots.length).toBe(2);
    expectPotSize(pots);

    const p1 = pots.find(p => p.amount === 1200);
    const p2 = pots.find(p => p.amount === 2400);

    expect(p1.playerIds).toEqual(jasmine.arrayWithExactContents(['1', '2', '3']));
    expect(p2.playerIds).toEqual(jasmine.arrayWithExactContents(['1', '3']));
  })

  it('should calculate pots with multiple all-ins', () => {
    const pots = calculatePots([
      {
        id: '1',
        inPotAmount: 400,
      },
      {
        id: '2',
        inPotAmount: 800,
      },
      {
        id: '3',
        inPotAmount: 2000,
      },
      {
        id: '4',
        inPotAmount: 2000,
      },
      {
        id: '5',
        inPotAmount: 600,
      }
    ]);

    expect(pots.length).toBe(4);
    expectPotSize(pots);

    const p1 = pots.find(p => p.amount === 2000);
    const p2 = pots.find(p => p.amount === 800);
    const p3 = pots.find(p => p.amount === 600);
    const p4 = pots.find(p => p.amount === 2400);

    expect(p1.playerIds).toEqual(jasmine.arrayWithExactContents(['1', '2', '3', '4', '5']));
    expect(p2.playerIds).toEqual(jasmine.arrayWithExactContents(['2', '3', '4', '5']));
    expect(p3.playerIds).toEqual(jasmine.arrayWithExactContents(['2', '3', '4']));
    expect(p4.playerIds).toEqual(jasmine.arrayWithExactContents(['3', '4']));
  })
});

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

fdescribe('end game', () => {
  describe('3 all-ins over 5', () => {
    const cards = getCards(['S_2', 'C_3', 'H_4', 'D_5', 'D_7']);
    const board: IBoard = {
      flop1: cards[0],
      flop2: cards[1],
      flop3: cards[2],
      turn: cards[3],
      river: cards[4],
    };

    let allIn1: IPlayer;
    let allIn2: IPlayer;
    let withBank1: IPlayer;
    let withBank2: IPlayer;
    let allIn3: IPlayer;
    let players: IPlayer[];

    // Straight high 13
    const winner1Cards: ICard[] = [
      getCard('S_13'),
      getCard('S_6'),
    ];
    // Straight high 13
    const winner2Cards: ICard[] = [
      getCard('C_13'),
      getCard('C_6'),
    ];
    // Pair
    const second: ICard[] = [
      getCard('S_8'),
      getCard('C_8'),
    ];
    // HighCard 12
    const third: ICard[] = [
      getCard('S_12'),
      getCard('C_10'),
    ];
    // HighCard 11
    const fourth: ICard[] = [
      getCard('H_11'),
      getCard('D_10'),
    ];

    beforeEach(() => {
      allIn1 = {
        id: '1',
        bank: 0,
        inPotAmount: 401, // to force rounding case
      };
      allIn2 = {
        id: '2',
        bank: 0,
        inPotAmount: 800,
      };
      withBank1 = {
        id: '3',
        bank: 1800,
        inPotAmount: 2000,
      };
      withBank2 = {
        id: '4',
        bank: 1200,
        inPotAmount: 2000,
      };
      allIn3 = {
        id: '5',
        bank: 0,
        inPotAmount: 600,
      };

      players = [
        withBank1,
        allIn3,
        allIn2,
        withBank2,
        allIn1,
      ];
    });

    describe('getWinnersOrder', () => {
      it('should group the two winners', () => {
        allIn1.cards = winner1Cards;
        allIn2.cards = winner2Cards;
        withBank1.cards = second;
        withBank2.cards = third;
        allIn3.cards = fourth;

        const orderedWinners = getWinnersOrder(players, board);

        expect(orderedWinners.length).toBe(4);

        const winnerGroup = orderedWinners[0];
        const secondGroup = orderedWinners[1];
        const thirdGroup = orderedWinners[2];
        const fourthGroup = orderedWinners[3];

        expect(winnerGroup.length).toBe(2);
        expect(secondGroup.length).toBe(1);
        expect(thirdGroup.length).toBe(1);
        expect(fourthGroup.length).toBe(1);

        expect(winnerGroup.map(g => g.playerId)).toEqual(['2', '1']);
        expect(secondGroup.map(g => g.playerId)).toEqual(['3']);
        expect(thirdGroup.map(g => g.playerId)).toEqual(['4']);
        expect(fourthGroup.map(g => g.playerId)).toEqual(['5']);
      });
    });

    describe('distributePot', () => {
      describe('no one has folded', () => {
        it('should distribute and split pots to the winners', () => {
          // allIn1 and allIn2 ties
          // they get half the pot they are in
          // withBank1 wins over withBank2 and allIn3
          // withBank1 gets the other pots
          allIn1.cards = winner1Cards;
          allIn2.cards = winner2Cards;
          withBank1.cards = second;
          withBank2.cards = third;
          allIn3.cards = fourth;

          const initialPlayersBank = new Map<string, number>([
            [allIn1.id, allIn1.bank],
            [allIn2.id, allIn2.bank],
            [withBank1.id, withBank1.bank],
            [withBank2.id, withBank2.bank],
            [allIn3.id, allIn3.bank],
          ]);

          distributePot({
            players,
            board,
            id: null,
          });

          expect(allIn1.bank).toBe(initialPlayersBank.get(allIn1.id) + 2005 / 2 + 0.5); // gets 0.5 to round to cent
          expect(allIn2.bank).toBe(initialPlayersBank.get(allIn2.id) + 2005 / 2 - 0.5 + 796 + 600); // loses 0.5 to round to cent
          expect(withBank1.bank).toBe(initialPlayersBank.get(withBank1.id) + 2400);
          expect(withBank2.bank).toBe(initialPlayersBank.get(withBank2.id));
          expect(allIn3.bank).toBe(initialPlayersBank.get(allIn3.id));
        });

        describe('one player wins over the remaining ones but could not bet with them because of his bank', () => {
          it('should distribute and split pots to the winners', () => {
            // allIn1 and allIn2 ties
            // they get half the pot they are in
            // allIn3 wins over withBank1 and withBank2 but could not bet with them, gets nothing
            // withBank1 wins over withBank2
            // withBank1 gets the other pots
            allIn1.cards = winner1Cards;
            allIn2.cards = winner2Cards;
            withBank1.cards = third;
            withBank2.cards = fourth;
            allIn3.cards = second;

            const initialPlayersBank = new Map<string, number>([
              [allIn1.id, allIn1.bank],
              [allIn2.id, allIn2.bank],
              [withBank1.id, withBank1.bank],
              [withBank2.id, withBank2.bank],
              [allIn3.id, allIn3.bank],
            ]);

            distributePot({
              players,
              board,
              id: null,
            });

            expect(allIn1.bank).toBe(initialPlayersBank.get(allIn1.id) + 2005 / 2 + 0.5); // gets 0.5 to round to cent
            expect(allIn2.bank).toBe(initialPlayersBank.get(allIn2.id) + 2005 / 2 - 0.5 + 796 + 600); // loses 0.5 to round to cent
            expect(withBank1.bank).toBe(initialPlayersBank.get(withBank1.id) + 2400);
            expect(withBank2.bank).toBe(initialPlayersBank.get(withBank2.id));
            expect(allIn3.bank).toBe(initialPlayersBank.get(allIn3.id));
          });
        });
      });

      describe('one has folded', () => {
        it('should distribute and split pots to the winners', () => {
          // allIn1 and allIn2 ties
          // they get half the pot they are in
          // withBank1 folds
          // withBank2 wins over allIn3
          // withBank2 gets the other pots
          allIn1.cards = winner1Cards;
          allIn2.cards = winner2Cards;
          withBank1.cards = second;
          withBank2.cards = third;
          allIn3.cards = fourth;

          allIn1.hasFolded = false;
          allIn2.hasFolded = false;
          withBank1.hasFolded = true;
          withBank2.hasFolded = false;
          allIn3.hasFolded = false;

          const initialPlayersBank = new Map<string, number>([
            [allIn1.id, allIn1.bank],
            [allIn2.id, allIn2.bank],
            [withBank1.id, withBank1.bank],
            [withBank2.id, withBank2.bank],
            [allIn3.id, allIn3.bank],
          ]);

          distributePot({
            players,
            board,
            id: null,
          });

          expect(allIn1.bank).toBe(initialPlayersBank.get(allIn1.id) + 2005 / 2 + 0.5); // gets 0.5 to round to cent
          expect(allIn2.bank).toBe(initialPlayersBank.get(allIn2.id) + 2005 / 2 - 0.5 + 796 + 600); // loses 0.5 to round to cent
          expect(withBank1.bank).toBe(initialPlayersBank.get(withBank1.id));
          expect(withBank2.bank).toBe(initialPlayersBank.get(withBank2.id) + 2400);
          expect(allIn3.bank).toBe(initialPlayersBank.get(allIn3.id));
        });
      });
    });
  });

  describe('2 all-ins with different amounts, lowest wins', () => {
    const cards = getCards(['S_2', 'C_3', 'H_4', 'D_5', 'D_7']);
    const board: IBoard = {
      flop1: cards[0],
      flop2: cards[1],
      flop3: cards[2],
      turn: cards[3],
      river: cards[4],
    };

    let allIn1: IPlayer;
    let allIn2: IPlayer;
    let players: IPlayer[];

    // Straight high 13
    const winnerCards: ICard[] = [
      getCard('S_13'),
      getCard('S_6'),
    ];
    // Pair
    const looserCards: ICard[] = [
      getCard('S_8'),
      getCard('C_8'),
    ];

    beforeEach(() => {
      allIn1 = {
        id: '1',
        bank: 0,
        inPotAmount: 500,
      };
      allIn2 = {
        id: '2',
        bank: 0,
        inPotAmount: 100,
      };

      players = [
        allIn2,
        allIn1,
      ];
    });

    describe('distributePot', () => {
      it('should distribute and split pots to the winners', () => {
        // allIn2 wins over allIn1
        // allIn2 get the pot he is in
        // allIn1 get the other pot
        allIn1.cards = looserCards;
        allIn2.cards = winnerCards;

        const initialPlayersBank = new Map<string, number>([
          [allIn1.id, allIn1.bank],
          [allIn2.id, allIn2.bank],
        ]);

        distributePot({
          players,
          board,
          id: null,
        });

        expect(allIn1.bank).toBe(initialPlayersBank.get(allIn1.id) + 400);
        expect(allIn2.bank).toBe(initialPlayersBank.get(allIn2.id) + 200); // loses 0.5 to round to cent
      });
    });
  });
});
