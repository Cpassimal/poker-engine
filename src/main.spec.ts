import { CardColor, HandType, IBoard, ICard, IPlayer } from './tools/interfaces';
import { calculateHand } from './tools/helper';
import { distributePot, getWinnersOrder, initGame } from './main';

const getColor = (str: string): CardColor => {
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

const getCard = (designation: string): ICard => {
  const [color, rank] = designation.split('_');

  return {
    color: getColor(color),
    rank: +rank,
  };
};

const getCards = (designations: string[]): ICard[] => designations.map(getCard);

fdescribe('initGame', () => {
  it('should return true', () => {
    for (let i = 0; i < 10; i++) {
      initGame();
    }

    expect(true).toBe(true);
  });
});

describe('calculateHand', () => {
  describe('RoyalFlush', () => {
    it('should find it', () => {
      const cards = getCards(['C_10', 'C_11', 'C_12', 'C_13', 'C_14', 'D_14', 'S_14']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.RoyalFlush);
    });

    it('should find it', () => {
      const cards = getCards(['D_5', 'D_10', 'D_12', 'D_11', 'D_14', 'D_13', 'S_2']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.RoyalFlush);
    });
  });

  describe('StraightFlush', () => {
    it('should find it', () => {
      const cards = getCards(['C_13', 'C_10', 'C_12', 'S_8', 'C_11', 'C_9', 'D_5']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.StraightFlush);
      expect(hand.height).toBe(13);
    });

    it('should find it and return the higher one', () => {
      const cards = getCards(['C_5', 'C_6', 'C_7', 'C_8', 'C_9', 'C_10', 'C_11']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.StraightFlush);
      expect(hand.height).toBe(11);
    });

    it('should find it even with ace in first', () => {
      const cards = getCards(['C_2', 'C_3', 'C_4', 'C_5', 'C_14', 'D_5', 'S_5']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.StraightFlush);
      expect(hand.height).toBe(5);
    });

    it('should find it and return the higher one, even with ace in first', () => {
      const cards = getCards(['C_14', 'C_2', 'C_3', 'C_4', 'C_5', 'C_6', 'D_3']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.StraightFlush);
      expect(hand.fullHand.reduce((sum, c) => sum + c.rank, 0)).toBe(20);
      expect(hand.height).toBe(6);
    });
  });

  describe('FourOfAKind', () => {
    it('should find it and take higher kicker', () => {
      const cards = getCards(['C_10', 'D_10', 'H_10', 'C_14', 'D_12', 'S_5', 'S_10']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.FourOfAKind);
      expect(hand.height).toBe(10);
      expect(hand.kicker1.rank).toBe(14);
    });

    it('should find it and take higher kicker, even with aces', () => {
      const cards = getCards(['C_10', 'D_14', 'H_14', 'C_14', 'D_12', 'S_14', 'S_9']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.FourOfAKind);
      expect(hand.height).toBe(14);
      expect(hand.kicker1.rank).toBe(12);
    });
  });

  describe('FullHouse', () => {
    it('should find it and take higher height', () => {
      const cards = getCards(['C_10', 'D_10', 'H_10', 'C_14', 'D_14', 'S_5', 'S_11']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.FullHouse);
      expect(hand.height).toBe(10);
      expect(hand.height2).toBe(14);
    });

    it('should find it and take higher height', () => {
      const cards = getCards(['C_10', 'D_10', 'H_10', 'C_14', 'D_14', 'S_14', 'S_11']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.FullHouse);
      expect(hand.height).toBe(14);
      expect(hand.height2).toBe(10);
    });

    it('should find it and take higher height and higher height2', () => {
      const cards = getCards(['C_11', 'D_11', 'H_11', 'C_7', 'D_7', 'S_9', 'D_9']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.FullHouse);
      expect(hand.height).toBe(11);
      expect(hand.height2).toBe(9);
    });
  });

  describe('Flush', () => {
    it('should find it', () => {
      const cards = getCards(['C_7', 'C_10', 'C_5', 'C_13', 'C_2', 'S_5', 'S_11']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.Flush);
      expect(hand.height).toBe(13);
      expect(hand.kicker1.rank).toBe(10);
      expect(hand.kicker2.rank).toBe(7);
      expect(hand.kicker3.rank).toBe(5);
      expect(hand.kicker4.rank).toBe(2);
    });

    it('should find it and take higher height', () => {
      const cards = getCards(['C_7', 'C_10', 'C_5', 'C_14', 'C_2', 'C_13', 'S_11']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.Flush);
      expect(hand.height).toBe(14);
      expect(hand.kicker1.rank).toBe(13);
      expect(hand.kicker2.rank).toBe(10);
      expect(hand.kicker3.rank).toBe(7);
      expect(hand.kicker4.rank).toBe(5);
    });
  });

  describe('Straight', () => {
    it('should find it', () => {
      const cards = getCards(['C_13', 'D_10', 'C_12', 'S_8', 'C_11', 'S_9', 'D_5']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.Straight);
      expect(hand.height).toBe(13);
    });

    it('should find it and return the higher one', () => {
      const cards = getCards(['D_5', 'C_6', 'C_7', 'D_8', 'C_9', 'C_10', 'D_11']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.Straight);
      expect(hand.height).toBe(11);
    });

    it('should find it even with ace in first', () => {
      const cards = getCards(['S_2', 'C_3', 'D_4', 'C_5', 'C_14', 'D_5', 'S_5']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.Straight);
      expect(hand.height).toBe(5);
    });

    it('should find it even with ace in last', () => {
      const cards = getCards(['S_10', 'C_11', 'D_12', 'C_13', 'C_14', 'D_5', 'S_5']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.Straight);
      expect(hand.height).toBe(14);
    });

    it('should find it and return the higher one, even with ace in first', () => {
      const cards = getCards(['D_14', 'C_2', 'C_3', 'S_4', 'C_5', 'C_6', 'D_3']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.Straight);
      expect(hand.height).toBe(6);
    });

    it('should find it and return the higher one, even with ace in last', () => {
      const cards = getCards(['D_14', 'C_10', 'C_9', 'S_11', 'C_12', 'C_13', 'D_8']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.Straight);
      expect(hand.height).toBe(14);
    });
  });

  describe('ThreeOfAKind', () => {
    it('should find it and take higher kickers', () => {
      const cards = getCards(['C_10', 'D_10', 'H_10', 'C_14', 'D_12', 'S_5', 'S_6']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.ThreeOfAKind);
      expect(hand.height).toBe(10);
      expect(hand.kicker1.rank).toBe(14);
      expect(hand.kicker2.rank).toBe(12);
    });
  });

  describe('TwoPair', () => {
    it('should find it and take higher kickers', () => {
      const cards = getCards(['C_10', 'D_10', 'H_14', 'C_14', 'D_12', 'S_5', 'S_6']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.TwoPair);
      expect(hand.height).toBe(14);
      expect(hand.height2).toBe(10);
      expect(hand.kicker1.rank).toBe(12);
    });

    it('should find it and take higher pairs and higher kicker', () => {
      const cards = getCards(['C_12', 'D_12', 'H_7', 'C_7', 'D_5', 'S_5', 'S_6']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.TwoPair);
      expect(hand.height).toBe(12);
      expect(hand.height2).toBe(7);
      expect(hand.kicker1.rank).toBe(6);
    });
  });

  describe('OnePair', () => {
    it('should find it and take higher kickers', () => {
      const cards = getCards(['C_10', 'D_10', 'H_14', 'C_7', 'D_12', 'S_5', 'S_6']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.OnePair);
      expect(hand.height).toBe(10);
      expect(hand.kicker1.rank).toBe(14);
      expect(hand.kicker2.rank).toBe(12);
      expect(hand.kicker3.rank).toBe(7);
    });
  });

  describe('HighCard', () => {
    it('should find it and take higher kickers', () => {
      const cards = getCards(['C_13', 'D_10', 'H_14', 'C_7', 'D_12', 'S_5', 'S_6']);

      const hand = calculateHand(cards);

      expect(hand).toBeDefined();
      expect(hand.type).toBe(HandType.HighCard);
      expect(hand.height).toBe(14);
      expect(hand.kicker1.rank).toBe(13);
      expect(hand.kicker2.rank).toBe(12);
      expect(hand.kicker3.rank).toBe(10);
      expect(hand.kicker4.rank).toBe(7);
    });
  });
});

describe('end game', () => {
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
        id: 1,
        bank: 0,
        inPotAmount: 401, // to force rounding case
      };
      allIn2 = {
        id: 2,
        bank: 0,
        inPotAmount: 800,
      };
      withBank1 = {
        id: 3,
        bank: 1800,
        inPotAmount: 2000,
      };
      withBank2 = {
        id: 4,
        bank: 1200,
        inPotAmount: 2000,
      };
      allIn3 = {
        id: 5,
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

        expect(winnerGroup.map(g => g.playerId)).toEqual(jasmine.arrayWithExactContents([2, 2]));
        expect(secondGroup.map(g => g.playerId)).toEqual(jasmine.arrayWithExactContents([3]));
        expect(thirdGroup.map(g => g.playerId)).toEqual(jasmine.arrayWithExactContents([4]));
        expect(fourthGroup.map(g => g.playerId)).toEqual(jasmine.arrayWithExactContents([5]));
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

          const initialPlayersBank: Map<number, number> = new Map<number, number>([
            [allIn1.id, allIn1.bank],
            [allIn2.id, allIn2.bank],
            [withBank1.id, withBank1.bank],
            [withBank2.id, withBank2.bank],
            [allIn3.id, allIn3.bank],
          ]);

          distributePot(players, board);

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

            const initialPlayersBank: Map<number, number> = new Map<number, number>([
              [allIn1.id, allIn1.bank],
              [allIn2.id, allIn2.bank],
              [withBank1.id, withBank1.bank],
              [withBank2.id, withBank2.bank],
              [allIn3.id, allIn3.bank],
            ]);

            distributePot(players, board);

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

          const initialPlayersBank: Map<number, number> = new Map<number, number>([
            [allIn1.id, allIn1.bank],
            [allIn2.id, allIn2.bank],
            [withBank1.id, withBank1.bank],
            [withBank2.id, withBank2.bank],
            [allIn3.id, allIn3.bank],
          ]);

          distributePot(players, board);

          expect(allIn1.bank).toBe(initialPlayersBank.get(allIn1.id) + 2005 / 2 + 0.5); // gets 0.5 to round to cent
          expect(allIn2.bank).toBe(initialPlayersBank.get(allIn2.id) + 2005 / 2 - 0.5 + 796 + 600); // loses 0.5 to round to cent
          expect(withBank1.bank).toBe(initialPlayersBank.get(withBank1.id));
          expect(withBank2.bank).toBe(initialPlayersBank.get(withBank2.id) + 2400);
          expect(allIn3.bank).toBe(initialPlayersBank.get(allIn3.id));
        });
      });
    });
  });
});
