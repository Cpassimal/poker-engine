import { calculatePots } from './helper';
import { IPot } from './interfaces';

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
        id: 1,
        inPotAmount: 1600,
      },
      {
        id: 2,
        inPotAmount: 1600,
      },
      {
        id: 3,
        inPotAmount: 1600,
      },
    ]);

    expect(pots.length).toBe(1);
    expectPotSize(pots);

    const p1 = pots.find(p => p.amount === 4800);

    expect(p1.playerIds).toEqual(jasmine.arrayWithExactContents([1, 2, 3]));
  })

  it('should calculate pots with one all-in', () => {
    const pots = calculatePots([
      {
        id: 1,
        inPotAmount: 1600,
      },
      {
        id: 2,
        inPotAmount: 400,
      },
      {
        id: 3,
        inPotAmount: 1600,
      },
    ]);

    expect(pots.length).toBe(2);
    expectPotSize(pots);

    const p1 = pots.find(p => p.amount === 1200);
    const p2 = pots.find(p => p.amount === 2400);

    expect(p1.playerIds).toEqual(jasmine.arrayWithExactContents([1, 2, 3]));
    expect(p2.playerIds).toEqual(jasmine.arrayWithExactContents([1, 3]));
  })

  it('should calculate pots with multiple all-ins', () => {
    const pots = calculatePots([
      {
        id: 1,
        inPotAmount: 400,
      },
      {
        id: 2,
        inPotAmount: 800,
      },
      {
        id: 3,
        inPotAmount: 2000,
      },
      {
        id: 4,
        inPotAmount: 2000,
      },
      {
        id: 5,
        inPotAmount: 600,
      }
    ]);

    expect(pots.length).toBe(4);
    expectPotSize(pots);

    const p1 = pots.find(p => p.amount === 2000);
    const p2 = pots.find(p => p.amount === 800);
    const p3 = pots.find(p => p.amount === 600);
    const p4 = pots.find(p => p.amount === 2400);

    expect(p1.playerIds).toEqual(jasmine.arrayWithExactContents([1, 2, 3, 4, 5]));
    expect(p2.playerIds).toEqual(jasmine.arrayWithExactContents([2, 3, 4, 5]));
    expect(p3.playerIds).toEqual(jasmine.arrayWithExactContents([2, 3, 4]));
    expect(p4.playerIds).toEqual(jasmine.arrayWithExactContents([3, 4]));
  })
});
