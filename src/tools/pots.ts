import { IPlayer, IPot } from './interfaces';

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
