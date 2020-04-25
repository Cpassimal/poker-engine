import {
  calculateHand,
  dealCards,
  getCardLabel,
  getHandLabel,
  getInitialDeck,
  getNewPosition,
  getPlayerLabel,
  pickCard,
  randomInt,
  setInitiative,
  sortHands
} from './tools/helper';
import {
  Decision,
  IBoard,
  ICard,
  IHand,
  IPlayer
} from './tools/interfaces';
import {
  player1,
  player2,
  player3,
  player4
} from './tools/data';

let pot = 0;
const sb = 10;
const bb = 2 * sb;
const emptyBoard: IBoard = {
  flop1: null,
  flop2: null,
  flop3: null,
  turn: null,
  river: null,
};

let players = [player1, player2, player3, player4];

export function initGame() {
  console.log('---------- START ----------');

  const deck = getInitialDeck();
  const board = { ...emptyBoard };

  /**
   * init round
   */
  const currentDeck = [...deck];
  pot = 0;

  for (const player of players) {
    player.cards = [];
    player.isAllIn = false;
    player.inPotAmount = 0;
    player.inRoundAmount = 0;
    player.hasFolded = false;
    player.position = getNewPosition(player, players.length);
  }

  players.sort((p1, p2) => p2.position < p1.position ? 1 : -1);

  dealCards(players, currentDeck);

  /**
   * PRE-FLOP
   */
  console.log('--- PRE-FLOP ---');

  playStreet(true);

  console.log('POT: ', pot);

  /**
   * FLOP
   */
  for (const player of players) {
    player.inPotAmount = player.inRoundAmount;
    player.inRoundAmount = 0;
    player.hasInitiative = false;
  }

  board.flop1 = pickCard(currentDeck);
  board.flop2 = pickCard(currentDeck);
  board.flop3 = pickCard(currentDeck);

  console.log('--- FLOP ---', `${getCardLabel(board.flop1)} | ${getCardLabel(board.flop2)} | ${getCardLabel(board.flop3)}`);

  playStreet();

  console.log('POT: ', pot);

  /**
   * TURN
   */
  for (const player of players) {
    player.inPotAmount += player.inRoundAmount;
    player.inRoundAmount = 0;
    player.hasInitiative = false;
  }

  board.turn = pickCard(currentDeck);

  console.log('--- TURN ---', `${getCardLabel(board.turn)}`);

  playStreet();

  console.log('POT: ', pot);

  /**
   * RIVER
   */
  for (const player of players) {
    player.inPotAmount += player.inRoundAmount;
    player.inRoundAmount = 0;
    player.hasInitiative = false;
  }

  board.river = pickCard(currentDeck);

  console.log('--- RIVER ---', `${getCardLabel(board.river)}`);

  playStreet();

  console.log('POT: ', pot);
  console.log('FINAL BOARD');
  console.table(Object.keys(board).map(key => getCardLabel(board[key])));
  console.log('---------- END ----------');

  /**
   * END
   */
  endGame(board);
}

function endGame(
  board?: IBoard,
): void {
  if (!board) {
    const winner = players.find(p => !p.hasFolded);

    winner.bank += pot;
  } else {
    setWinOrder(players.filter(p => !p.hasFolded), board);

    // console.table(
    //   players.map(p => ({
    //     name: p.name,
    //     cards: p.cards.map(getCardLabel),
    //     hand: getHandLabel(p.hand),
    //   })),
    // );

    const winners = players.filter(w => w.hasWon);
    const losers = players.filter(w => !w.hasWon);

    const highestWonBet = Math.max(...winners.map(p => p.inRoundAmount));

    for (const loser of losers) {
      if (loser.inRoundAmount > highestWonBet) {
        const refund = loser.inRoundAmount - highestWonBet;
        loser.bank += refund;
        pot -= refund;
      }
    }

    for (const winner of winners) {
       winner.bank += winner.inRoundAmount;
       pot -= winner.inRoundAmount;
    }
  }

  console.log('--- STATE --- ');
  console.table(
    players.map(p => ({
      name: p.name,
      bank: p.bank,
    })),
  );
}

function playStreet(
  isPreflop: boolean = false,
) {
  let asked = 0;
  let nbrOfTurn = 0;

  do {
    for (const player of players.filter(p => !p.hasFolded)) {
      if (player.hasInitiative || !players.some(p => p.id !== player.id && !p.hasFolded && !p.isAllIn)) {
        return;
      }

      if (player.isAllIn) {
        continue;
      }

      let availableDecisions: Decision[] = [];

      if (asked === 0) {
        availableDecisions = [Decision.Check];

        if (!player.isAllIn) {
          availableDecisions.push(Decision.Bet);
        }
      } else if (asked > player.inRoundAmount) {
        availableDecisions = [Decision.Fold, Decision.Call];

        if (player.bank > (asked - player.inRoundAmount)) {
          availableDecisions.push(Decision.Raise);
        }
      } else if (asked === player.inRoundAmount) {
        availableDecisions = [Decision.Check, Decision.Raise];
      }

      if (isPreflop && nbrOfTurn === 0 && [1, 2].includes(player.position)) {
        availableDecisions = [Decision.Bet];
      }

      const decision = availableDecisions.length > 1
        ? availableDecisions[randomInt(0, availableDecisions.length - 1)]
        : availableDecisions[0];

      switch (decision) {
        case Decision.Bet: {
          let betValue = bb;

          if (isPreflop && nbrOfTurn === 0 && player.position === 1) {
            betValue = sb;
          }

          asked = bet(player, betValue);
          setInitiative(players, player);

          console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, ${betValue} (in street pot: ${player.inRoundAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

          break;
        }
        case Decision.Call: {
          const betValue = bet(player, asked - player.inRoundAmount);

          console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, ${betValue} (in street pot: ${player.inRoundAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

          break;
        }
        case Decision.Fold: {
          player.hasFolded = true;

          console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, (in street pot: ${player.inRoundAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

          break;
        }
        case Decision.Raise: {
          const raiseValue = asked * 3;
          const betValue = bet(player, raiseValue);
          asked = player.inRoundAmount;
          setInitiative(players, player);

          console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, ${betValue} (in street pot: ${player.inRoundAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

          break;
        }
        case Decision.Check: {
          console.log(`${getPlayerLabel(player, players.length)}: ${Decision[decision]}s, (in street pot: ${player.inRoundAmount}) ${player.isAllIn ? 'and is all-in' : ''}`);

          break;
        }
      }
    }

    nbrOfTurn++;

    if (nbrOfTurn === 10) {
      console.log('SECURITY HIT');
      
      break;
    }
  } while (
    players.filter(p => p.hasFolded).length < players.length - 1
    && players.filter(p => p.isAllIn).length < players.length
    && !players.filter(p => !p.hasFolded).every(p => p.inRoundAmount === asked || p.isAllIn)
  )
}

function bet(
  player: IPlayer,
  amount: number,
): number {
  let betValue: number;

  if (player.bank >= amount) {
    betValue = amount;
  } else {
    betValue = player.bank;
    player.isAllIn = true;
  }

  pot += betValue;
  player.bank -= betValue;
  player.inRoundAmount += betValue;

  return betValue;
}

function setWinOrder(
  players: IPlayer[],
  board: IBoard,
): void {
  const boardCards: ICard[] = [board.flop1, board.flop2, board.flop3, board.turn, board.river];

  const hands: IHand[] = [];

  for (const player of players) {
    const hand = calculateHand([
      ...boardCards,
      ...player.cards,
    ]);

    hand.playerId = player.id;
    hand.id = `${hand.type}_${hand.height}_${hand.height2}_${hand.kicker1}_${hand.kicker2}_${hand.kicker3}_${hand.kicker4}`;

    player.hand = hand;

    hands.push(hand);
  }

  const sortedHands = hands.sort(sortHands);
  const bestHand = sortedHands[0];

  for (const player of players) {
    if (player.hand.id === bestHand.id) {
      player.hasWon = true;
    }
  }
}
