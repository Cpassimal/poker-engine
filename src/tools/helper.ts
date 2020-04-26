import {
  groupBy,
  uniq
} from 'lodash';
import {
  CardColor,
  cardMap,
  HandType,
  ICard,
  IHand,
  IPlayer, IPot,
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

const sortByRank = (c1: ICard, c2: ICard) => c2.rank < c1.rank ? 1 : -1;

export const compareHands = (h1: IHand, h2: IHand): number => {
  if (h2.type !== h1.type) {
    return h2.type - h1.type;
  }

  if (h2.height !== h1.height) {
    return h2.height - h1.height;
  }

  if (h2.height2 !== h1.height2) {
    return h2.height2 - h1.height2;
  }

  if (h2.kicker1?.rank !== h1.kicker1?.rank) {
    return h2.kicker1?.rank - h1.kicker1?.rank;
  }

  if (h2.kicker2?.rank !== h1.kicker2?.rank) {
    return h2.kicker2?.rank - h1.kicker2?.rank;
  }

  if (h2.kicker3?.rank !== h1.kicker3?.rank) {
    return h2.kicker3?.rank - h1.kicker3?.rank;
  }

  if (h2.kicker4?.rank !== h1.kicker4?.rank) {
    return h2.kicker4?.rank - h1.kicker4?.rank;
  }

  return 0;
};

/**
 * The idea here is not to check every possibility, but stop if we found the better hand possible.
 */
export function calculateHand(cards: ICard[]): IHand {
  if (cards.length !== 7) {
    throw new Error ('a hand must be calculated from 7 cards');
  }

  if (uniq(cards.map(c => `${c.rank}_${c.color}`)).length !== cards.length) {
    throw new Error ('duplicate founds');
  }

  // 5c7 = 21 possibilities
  const listOfFives: ICard[][] = [
    [cards[0], cards[1], cards[2], cards[3], cards[4]].sort(sortByRank),
    [cards[0], cards[1], cards[2], cards[3], cards[5]].sort(sortByRank),
    [cards[0], cards[1], cards[2], cards[3], cards[6]].sort(sortByRank),
    [cards[0], cards[1], cards[2], cards[4], cards[5]].sort(sortByRank),
    [cards[0], cards[1], cards[2], cards[4], cards[6]].sort(sortByRank),
    [cards[0], cards[1], cards[2], cards[5], cards[6]].sort(sortByRank),
    [cards[0], cards[1], cards[3], cards[4], cards[5]].sort(sortByRank),
    [cards[0], cards[1], cards[3], cards[4], cards[6]].sort(sortByRank),
    [cards[0], cards[1], cards[3], cards[5], cards[6]].sort(sortByRank),
    [cards[0], cards[1], cards[4], cards[5], cards[6]].sort(sortByRank),
    [cards[0], cards[2], cards[3], cards[4], cards[5]].sort(sortByRank),
    [cards[0], cards[2], cards[3], cards[4], cards[6]].sort(sortByRank),
    [cards[0], cards[2], cards[3], cards[5], cards[6]].sort(sortByRank),
    [cards[0], cards[2], cards[4], cards[5], cards[6]].sort(sortByRank),
    [cards[0], cards[3], cards[4], cards[5], cards[6]].sort(sortByRank),
    [cards[1], cards[2], cards[3], cards[4], cards[5]].sort(sortByRank),
    [cards[1], cards[2], cards[3], cards[4], cards[6]].sort(sortByRank),
    [cards[1], cards[2], cards[3], cards[5], cards[6]].sort(sortByRank),
    [cards[1], cards[2], cards[4], cards[5], cards[6]].sort(sortByRank),
    [cards[1], cards[3], cards[4], cards[5], cards[6]].sort(sortByRank),
    [cards[2], cards[3], cards[4], cards[5], cards[6]].sort(sortByRank),
  ];

  /**
   * RoyalFlush
   */
  for (const listOfFive of listOfFives) {
    const color = listOfFive[0].color;

    if (
      listOfFive.every(card => card.color === color)
      && listOfFive.reduce((sum, c) => sum + c.rank, 0) === 60
    ) {
      return {
        type: HandType.RoyalFlush,
        fullHand: listOfFive,
      }
    }
  }

  /**
   * StraightFlush
   */
  const straightFlushes: IHand[] = [];

  for (const listOfFive of listOfFives) {
    const color = listOfFive[0].color;

    if (listOfFive.every(card => card.color === color)) {
      // it allow us to take into account the case of the strait with ace in first
      const tempListOfFive = [
        ...listOfFive.map(c =>( { ...c })),
      ];

      for (const card of tempListOfFive) {
        if (card.rank === 14) {
          card.rank = 1;
        }
      }

      tempListOfFive.sort(sortByRank);

      if (
        tempListOfFive[1].rank === tempListOfFive[0].rank + 1
        && tempListOfFive[2].rank === tempListOfFive[1].rank + 1
        && tempListOfFive[3].rank === tempListOfFive[2].rank + 1
        && tempListOfFive[4].rank === tempListOfFive[3].rank + 1
      ) {
        straightFlushes.push({
          type: HandType.StraightFlush,
          fullHand: tempListOfFive,
          height: tempListOfFive[4].rank,
        });
      }
    }
  }

  if (straightFlushes.length) {
    return straightFlushes.find(h => h.height === Math.max(...straightFlushes.map(h => h.height)));
  }

  /**
   * FourOfAKind
   */
  const fourOfAKinds: IHand[] = [];

  for (const listOfFive of listOfFives) {
    const firstCard = listOfFive[0];
    const secondCard = listOfFive[1];

    if (listOfFive.filter(c => c.rank === firstCard.rank).length === 4) {
      fourOfAKinds.push({
        type: HandType.FourOfAKind,
        fullHand: listOfFive,
        height: firstCard.rank,
        kicker1: listOfFive.find(c => c.rank !== firstCard.rank),
      })
    }

    if (
      firstCard.rank !== secondCard.rank
      && listOfFive.filter(c => c.rank === secondCard.rank).length === 4
    ) {
      fourOfAKinds.push({
        type: HandType.FourOfAKind,
        fullHand: listOfFive,
        height: secondCard.rank,
        kicker1: listOfFive.find(c => c.rank !== secondCard.rank),
      })
    }
  }

  if (fourOfAKinds.length) {
    return fourOfAKinds.find(h => h.kicker1.rank === Math.max(...fourOfAKinds.map(h => h.kicker1.rank)));
  }

  /**
   * FullHouse
   */
  const fullHouses: IHand[] = [];

  for (const listOfFive of listOfFives) {
    const firstCard = listOfFive[0];
    const lastCard = listOfFive[4];

    if (
      listOfFive.filter(c => c.rank === firstCard.rank).length === 3
      && listOfFive.filter(c => c.rank === lastCard.rank).length === 2
    ) {
      fullHouses.push({
        type: HandType.FullHouse,
        fullHand: listOfFive,
        height: firstCard.rank,
        height2: lastCard.rank,
      });
    }

    if (
      listOfFive.filter(c => c.rank === lastCard.rank).length === 3
      && listOfFive.filter(c => c.rank === firstCard.rank).length === 2
    ) {
      fullHouses.push({
        type: HandType.FullHouse,
        fullHand: listOfFive,
        height: lastCard.rank,
        height2: firstCard.rank,
      });
    }
  }

  if (fullHouses.length) {
    const bestFullHouses = fullHouses.filter(h => h.height === Math.max(...fullHouses.map(h => h.height)));

    return bestFullHouses.find(h => h.height2 === Math.max(...bestFullHouses.map(h => h.height2)));
  }

  /**
   * Flush
   */
  const flushes: IHand[] = [];

  for (const listOfFive of listOfFives) {
    const color = listOfFive[0].color;

    if (listOfFive.every(card => card.color === color)) {
      flushes.push({
        type: HandType.Flush,
        fullHand: listOfFive,
        height: listOfFive[4].rank,
        kicker1: listOfFive[3],
        kicker2: listOfFive[2],
        kicker3: listOfFive[1],
        kicker4: listOfFive[0],
      });
    }
  }

  if (flushes.length) {
    flushes.sort(compareHands);

    return flushes[0];
  }

  /**
   * Straight
   */
  const straits: IHand[] = [];

  for (const listOfFive of listOfFives) {
    if (
      listOfFive[4].rank === 14
      && listOfFive[0].rank === 2
      && listOfFive[1].rank === 3
      && listOfFive[2].rank === 4
      && listOfFive[3].rank === 5
    ) {
      straits.push({
        type: HandType.Straight,
        fullHand: listOfFive,
        height: listOfFive[3].rank,
      });
    }

    if (
      listOfFive[1].rank === listOfFive[0].rank + 1
      && listOfFive[2].rank === listOfFive[1].rank + 1
      && listOfFive[3].rank === listOfFive[2].rank + 1
      && listOfFive[4].rank === listOfFive[3].rank + 1
    ) {
      straits.push({
        type: HandType.Straight,
        fullHand: listOfFive,
        height: listOfFive[4].rank,
      });
    }
  }

  if (straits.length) {
    return straits.find(s => s.height === Math.max(...straits.map(s => s.height)));
  }

  /**
   * ThreeOfAKind
   */
  const threeOfKinds: IHand[] = [];

  for (const listOfFive of listOfFives) {
    const grouped = groupBy(listOfFive, c => c.rank);

    for (const rank in grouped) {
      if (grouped.hasOwnProperty(rank) && grouped[rank].length === 3) {
        const kickers = listOfFive.filter(c => c.rank !== +rank).sort(sortByRank);

        threeOfKinds.push({
          type: HandType.ThreeOfAKind,
          fullHand: listOfFive,
          height: +rank,
          kicker1: kickers[1],
          kicker2: kickers[0],
        });
      }
    }
  }

  if (threeOfKinds.length) {
    threeOfKinds.sort(compareHands);

    return threeOfKinds[0];
  }

  /**
   * TwoPair
   */
  const twoPairs: IHand[] = [];

  for (const listOfFive of listOfFives) {
    const grouped = groupBy<ICard>(listOfFive, c => c.rank);

    const pairs: IHand[] = [];

    for (const rank in grouped) {
      if (grouped.hasOwnProperty(rank) && grouped[rank].length === 2) {
        pairs.push({
          height: grouped[rank][0].rank,
        });
      }
    }

    if (pairs.length === 2) {
      pairs.sort((h1: IHand, h2: IHand) => h2.height > h1.height ? 1 : -1);

      twoPairs.push({
        type: HandType.TwoPair,
        fullHand: listOfFive,
        height: pairs[0].height,
        height2: pairs[1].height,
        kicker1: listOfFive.find(c => c.rank !== pairs[0].height && c.rank !== pairs[1].height),
      });
    }
  }

  if (twoPairs.length) {
    twoPairs.sort(compareHands);

    return twoPairs[0];
  }

  /**
   * OnePair
   */
  const pairs: IHand[] = [];

  for (const listOfFive of listOfFives) {
    const grouped = groupBy<ICard>(listOfFive, c => c.rank);

    for (const rank in grouped) {
      if (grouped.hasOwnProperty(rank) && grouped[rank].length === 2) {
        const pairHeight = grouped[rank][0].rank;
        const kickers = listOfFive.filter(c => c.rank !== pairHeight).sort(sortByRank);

        pairs.push({
          type: HandType.OnePair,
          fullHand: listOfFive,
          height: pairHeight,
          kicker1: kickers[2],
          kicker2: kickers[1],
          kicker3: kickers[0],
        });
      }
    }
  }

  if (pairs.length) {
    pairs.sort(compareHands);

    return pairs[0];
  }

  /**
   * HighCard
   */
  const highCards: IHand[] = [];

  for (const listOfFive of listOfFives) {
    highCards.push({
      type: HandType.HighCard,
      fullHand: listOfFive,
      height: listOfFive[4].rank,
      kicker1: listOfFive[3],
      kicker2: listOfFive[2],
      kicker3: listOfFive[1],
      kicker4: listOfFive[0],
    });
  }

  return highCards.sort(compareHands)[0];
}

export function getHandLabel(hand: IHand): string {
  const fullHand = hand.fullHand;

  switch (hand.type) {
    case HandType.RoyalFlush: {
      return `Royal flush of ${CardColor[hand.fullHand[0].color]}`;
    }
    case HandType.StraightFlush: {
      return `Straight flush of ${CardColor[fullHand[0].color]}, height: ${cardMap.get(fullHand[4].rank)}`;
    }
    case HandType.FourOfAKind: {
      return `Quads of ${cardMap.get(hand.height)}, height: ${cardMap.get(hand.kicker1.rank)}`;
    }
    case HandType.FullHouse: {
      return `Full house of ${cardMap.get(hand.height)} over ${cardMap.get(hand.height2)}`;
    }
    case HandType.Flush: {
      return `Flush of ${CardColor[fullHand[0].color]}, height: ${cardMap.get(fullHand[4].rank)}`;
    }
    case HandType.Straight: {
      return `Strait, height: ${cardMap.get(hand.height)}`;
    }
    case HandType.ThreeOfAKind: {
      return `Triple of ${cardMap.get(hand.height)}, kickers: ${cardMap.get(hand.kicker1.rank)}, ${cardMap.get(hand.kicker2.rank)}`;
    }
    case HandType.TwoPair: {
      return `Two pairs ${cardMap.get(hand.height)} & ${cardMap.get(hand.height2)}, kicker: ${cardMap.get(hand.kicker1.rank)}`;
    }
    case HandType.OnePair: {
      return `One Pair of ${cardMap.get(hand.height)}, kickers: ${cardMap.get(hand.kicker1.rank)}, ${cardMap.get(hand.kicker2.rank)}, ${cardMap.get(hand.kicker3.rank)}`;
    }
    case HandType.HighCard: {
      return `High card ${cardMap.get(hand.height)}, kickers: ${cardMap.get(hand.kicker1.rank)}, ${cardMap.get(hand.kicker2.rank)}, ${cardMap.get(hand.kicker3.rank)}, ${cardMap.get(hand.kicker4.rank)}`;
    }
  }
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

export function comparePlayerPerPot(
  p1: IPlayer,
  p2: IPlayer,
): number {
  return p1.inPotAmount - p2.inPotAmount;
}

export function calculatePots(
  players: IPlayer[]
): IPot[] {
  const pots: IPot[] = [];

  const sortedPlayers = [...players].sort(comparePlayerPerPot);

  for (const player of sortedPlayers) {
    let toDistribute = player.inPotAmount;

    while (toDistribute) {
      const existingPot = pots.find(p => p.size <= toDistribute && !p.playerIds.includes(player.id));

      if (existingPot) {
        toDistribute -= existingPot.size;
        existingPot.playerIds.push(player.id);
        existingPot.amount += existingPot.size;
      } else {
        pots.push({
          playerIds: [player.id],
          size: toDistribute,
          amount: toDistribute,
        });
        toDistribute = 0;
      }
    }
  }

  return pots;
}
