import {
  CardColor,
  HandType,
  ICard
} from './tools/interfaces';
import { calculateHand } from './tools/helper';
import { initGame } from './main';

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
}

const getCards = (designations: string[]): ICard[] => designations.map(d => {
  const [color, rank] = d.split('_');

  return {
    color: getColor(color),
    rank: +rank,
  };
});

describe('initGame', () => {
  it('should return true', () => {
    for (let i = 0; i < 2; i++) {
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