import axios from 'axios';
import { Server as WsServer } from 'socket.io';
import { Server } from 'http';
import { initServer } from '../init';
import { Client } from './client';
import { Decision, IPlayer, ITable, Street } from '../tools/interfaces';
import { emptyBoard, tables } from '../tools/data';

let server: Server;
let wss: WsServer;
const port = 5000;
const baseUrl = `http://localhost:${port}`;
const wsUrl = `ws://localhost:${port}`;

async function generateClients(nbr: number, tableId: string): Promise<Client[]> {
  return await Promise.all(
    Array(nbr).fill(0).map(async _ => {
      const client = new Client(wsUrl);
      await client.init();
      client.join(tableId);

      await waitFor(() => {
        expect(client.players.some(p => p.id === client.self.id)).toBeTrue();
      });

      return client;
    }),
  );
}

export function waitFor(
  expectations: () => any,
  timeout: number = 1000,
): Promise<void> {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => {
      end();
    }, timeout);

    const end = () => {
      clearTimeout(timer);
      clearInterval(interval);
      // run expectations one last time, this time letting jasmine process the results
      expectations();
      res();
    };

    const interval = setInterval(() => {
      let allPasses = true;

      // proxy jasmine processResult function in order to intercept the results
      // of expects ran during expectations()
      // if all passes, resolve immediately
      // if one fails, keep trying until until timeout has been reached
      const bk = (jasmine as any).Expector.prototype.processResult;
      (jasmine as any).Expector.prototype.processResult = function (ret: any): any {
        allPasses = allPasses && ret.pass;
      };
      expectations();
      (jasmine as any).Expector.prototype.processResult = bk;

      if (allPasses) {
        end();
      }
    }, 10);
  });
}

function expectTurn(
  clients: Client[],
  expectations: IPlayer[],
  context: string,
): void {
  for (const client of clients) {
    for (const player of client.players) {
      const expectPlayer = expectations.find(e => e.id === player.id);

      const keysToTest = Object.keys(expectPlayer);

      for (const key of keysToTest) {
        const value = player[key];

        if (Array.isArray(value)) {
          expect([...value].sort()).toEqual([...expectPlayer[key]].sort(), `${context} ${player.name}, ${key}`);
        } else {
          expect(player[key]).toBe(expectPlayer[key], `${context} ${player.name}, ${key}`);
        }
      }

      if (player.id === client.self.id) {
        expect(player.cards.length).toBe(2, `${context} ${player.name}, cards`);
      } else {
        expect(player.cards.length).toBe(0, `${context} ${player.name}, cards`);
      }
    }
  }
}

function expectTurnAdvanced(
  clients: Client[],
  table: ITable,
  expectations: any,
  context: string,
): void {
  expectTurn(clients, clients.map((c) => {
    const isSb = c.self.position === 1;
    const isBb = c.self.position === 2;
    const isUtg = c.self.position === 3;
    const isBtn = c.self.position === 4;

    const base: IPlayer = {
      id: c.self.id,
      inPotAmount: 0,
      inStreetAmount: 0,
      bank: table.options.initBank,
      availableDecisions: [],
      isTurn: false,
      isAllIn: false,
      hasInitiative: false,
      hasFolded: false,
    };

    if (isSb) {
      return {
        ...base,
        ...expectations.sb,
      }
    }

    if (isBb) {
      return {
        ...base,
        ...expectations.bb,
      }
    }

    if (isUtg) {
      return {
        ...base,
        ...expectations.utg,
      }
    }

    if (isBtn) {
      return {
        ...base,
        ...expectations.btn,
      }
    }

    return base;
  }), context);
}

function expectTurnInit(
  clients: Client[],
  table: ITable,
): void {
  const sb = clients.find(c => c.position === 1);

  expectTurn(clients, clients.map((c) => ({
    id: c.self.id,
    inPotAmount: 0,
    inStreetAmount: 0,
    bank: 1000,
    isTurn: c.self.id === sb.self.id,
    availableDecisions: c.self.id === sb.self.id ? [Decision.Bet] : [],
    isAllIn: false,
    hasInitiative: false,
    hasFolded: false,
  })), 'init');

  expect(table.street).toBe(Street.PreFlop);
  expect(clients.every(c => !c.table.isPreFlopSecondTurn)).toBeTrue();
}

fdescribe('game', () => {
  beforeAll(async (done) => {
    const ret = initServer(port);
    server = ret.server;
    wss = ret.wss;

    done();
  });

  afterAll(async (done) => {
    await Promise.all([
      new Promise((res, rej) => {
        server.close(res);
      }),
      new Promise((res, rej) => {
        wss.close(res);
      }),
    ]);

    done();
  });

  describe('createTable', () => {
    it('POST /game/init', async (done) => {
      const response = await axios.post(
        baseUrl + '/game/init',
        {
          options: {
            sb: 10,
            bb: 20,
            timer: 60,
            initBank: 1000,
          },
        },
      );

      expect(response).toBeDefined();
      expect(response.status).toBe(200);

      const content = response.data;

      expect(content.id).toBeDefined();
      expect(content.board).toEqual(emptyBoard);
      expect(content.players).toEqual([]);
      expect(content.deck).toBeUndefined();

      done();
    });
  });

  describe('wss', () => {
    let tableId: string;

    beforeEach(async (done) => {
      const response = await axios.post(
        baseUrl + '/game/init',
        {
          options: {
            sb: 10,
            timer: 60,
            initBank: 1000,
          },
        },
      );

      expect(response).toBeDefined();
      expect(response.status).toBe(200);

      const content = response.data;
      tableId = content.id;

      expect(content.id).toBeDefined();
      expect(content.board).toEqual(emptyBoard);
      expect(content.players).toEqual([]);
      expect(content.deck).toBeUndefined();

      done();
    });

    describe('sit', () => {
      it('should add players to table', async () => {
        const client1 = new Client(wsUrl);
        const client2 = new Client(wsUrl);
        const client3 = new Client(wsUrl);

        await Promise.all([
          client1.init(),
          client2.init(),
          client3.init(),
        ]);

        client1.join(tableId);

        await waitFor(() => {
          expect(client1.players.length).toBe(1);
          expect(client2.players.length).toBe(0);
          expect(client3.players.length).toBe(0);
        });

        expect(client1.players).toEqual([jasmine.objectContaining({ id: client1.self.id })]);
        expect(client2.players).toEqual([]);
        expect(client3.players).toEqual([]);

        client2.join(tableId);

        await waitFor(() => {
          expect(client1.players.length).toBe(2);
          expect(client2.players.length).toBe(2);
          expect(client3.players.length).toBe(0);
        });

        expect(client1.players).toEqual([
          jasmine.objectContaining({ id: client1.self.id }),
          jasmine.objectContaining({ id: client2.self.id }),
        ]);
        expect(client2.players).toEqual([
          jasmine.objectContaining({ id: client1.self.id }),
          jasmine.objectContaining({ id: client2.self.id }),
        ]);
        expect(client3.players).toEqual([]);

        client3.join(tableId);

        await waitFor(() => {
          expect(client1.players.length).toBe(3);
          expect(client2.players.length).toBe(3);
          expect(client3.players.length).toBe(3);
        });

        expect(client1.players).toEqual([
          jasmine.objectContaining({ id: client1.self.id }),
          jasmine.objectContaining({ id: client2.self.id }),
          jasmine.objectContaining({ id: client3.self.id }),
        ]);
        expect(client2.players).toEqual([
          jasmine.objectContaining({ id: client1.self.id }),
          jasmine.objectContaining({ id: client2.self.id }),
          jasmine.objectContaining({ id: client3.self.id }),
        ]);
        expect(client3.players).toEqual([
          jasmine.objectContaining({ id: client1.self.id }),
          jasmine.objectContaining({ id: client2.self.id }),
          jasmine.objectContaining({ id: client3.self.id }),
        ]);
      });
    });

    describe('game', () => {
      let clients: Client[];
      let leader: Client;
      let table: ITable;
      let sb: Client;
      let bb: Client;
      let utg: Client;
      let btn: Client;

      beforeEach(async () => {
        clients = await generateClients(4, tableId);
        leader = clients.find(c => c.isLeader);
        table = tables.find(t => t.id === tableId);

        leader.start();

        await waitFor(() => {
          expect(clients.every(c => c.cards.length === 2)).toBeTrue();
          expect(clients.every(c => c.position)).toBeTruthy();
        });

        sb = clients.find(c => c.position === 1);
        bb = clients.find(c => c.position === 2);
        utg = clients.find(c => c.position === 3);
        btn = clients.find(c => c.position === 4);

        expectTurnInit(clients, table);
      });

      describe('everybody folds, bb wins', () => {
        it('should end game after sb folds', async () => {
          sb.play(Decision.Bet, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === sb.self.id).inStreetAmount === table.options.sb)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              isTurn: true,
              availableDecisions: [Decision.Bet],
            },
            utg: {},
            btn: {},
          }, 'after sb');

          bb.play(Decision.Bet, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === bb.self.id).inStreetAmount === table.options.sb * 2)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
            },
            btn: {},
          }, 'after bb');

          utg.play(Decision.Fold, table.asked);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === utg.self.id).hasFolded)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              hasFolded: true
            },
            btn: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
            },
          }, 'after utg');

          btn.play(Decision.Fold, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === btn.self.id).hasFolded)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              hasFolded: true,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after btn');

          sb.play(Decision.Fold, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === sb.self.id).hasFolded)).toBeTrue();
          });

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === bb.self.id).bank === table.options.initBank + table.options.sb)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              isTurn: true,
              availableDecisions: [Decision.Bet],
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              bank: table.options.initBank + table.options.sb,
            },
            utg: {},
            btn: {},
          }, 'after sb 2');
        });
      });

      describe('nobody takes initiative, bb checks', () => {
        it('should end preflop after bb checks', async () => {
          sb.play(Decision.Bet, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === sb.self.id).inStreetAmount === table.options.sb)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              isTurn: true,
              availableDecisions: [Decision.Bet],
            },
            utg: {},
            btn: {},
          }, 'after sb');

          bb.play(Decision.Bet, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === bb.self.id).inStreetAmount === table.options.sb * 2)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
            },
            btn: {},
          }, 'after bb');

          utg.play(Decision.Call, table.asked);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === utg.self.id).inStreetAmount === table.asked)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            btn: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
            },
          }, 'after utg');

          btn.play(Decision.Fold, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === btn.self.id).hasFolded)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after btn');

          sb.play(Decision.Fold, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === sb.self.id).hasFolded)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              hasFolded: true,
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              isTurn: true,
              hasInitiative: true,
              availableDecisions: [Decision.Check, Decision.Fold, Decision.Raise],
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after sb 2');

          bb.play(Decision.Check, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === bb.self.id).isTurn)).toBeTrue();
            expect(table.street).toBe(Street.Flop);
            expect(table.board.flop1).not.toBeNull();
            expect(table.board.flop2).not.toBeNull();
            expect(table.board.flop3).not.toBeNull();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              hasFolded: true,
              inPotAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              isTurn: true,
              availableDecisions: [Decision.Check, Decision.Fold, Decision.Bet],
              inPotAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              inPotAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after bb 2');
        });
      });

      describe('utg raises, bb calls', () => {
        it('should let bb call after utg took initiative, and end preflop', async () => {
          sb.play(Decision.Bet, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === sb.self.id).inStreetAmount === table.options.sb)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              isTurn: true,
              availableDecisions: [Decision.Bet],
            },
            utg: {},
            btn: {},
          }, 'after sb');

          bb.play(Decision.Bet, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === bb.self.id).inStreetAmount === table.options.sb * 2)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
            },
            btn: {},
          }, 'after bb');

          const utgRaiseValue = table.asked * 3;

          utg.play(Decision.Raise, utgRaiseValue);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === utg.self.id).inStreetAmount === utgRaiseValue)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              hasInitiative: true,
              inStreetAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            btn: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
            },
          }, 'after utg');

          btn.play(Decision.Fold, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === btn.self.id).hasFolded)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              hasInitiative: true,
              inStreetAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after btn');

          sb.play(Decision.Fold, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === sb.self.id).hasFolded)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              hasFolded: true,
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              hasInitiative: true,
              inStreetAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after sb 2');

          bb.play(Decision.Call, utgRaiseValue - table.options.sb * 2);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === bb.self.id).isTurn)).toBeTrue();
            expect(table.street).toBe(Street.Flop);
            expect(table.board.flop1).not.toBeNull();
            expect(table.board.flop2).not.toBeNull();
            expect(table.board.flop3).not.toBeNull();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              hasFolded: true,
              inPotAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              isTurn: true,
              availableDecisions: [Decision.Check, Decision.Fold, Decision.Bet],
              inPotAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            utg: {
              inPotAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after bb 2');
        });
      });

      describe('utg raises, sb calls, bb raises, utg calls, sb calls', () => {
        it('should end preflop after sb calls', async () => {
          sb.play(Decision.Bet, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === sb.self.id).inStreetAmount === table.options.sb)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              isTurn: true,
              availableDecisions: [Decision.Bet],
            },
            utg: {},
            btn: {},
          }, 'after sb');

          bb.play(Decision.Bet, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === bb.self.id).inStreetAmount === table.options.sb * 2)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              hasInitiative: true,
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
            },
            btn: {},
          }, 'after bb');

          const utgRaiseValue = table.asked * 3;

          utg.play(Decision.Raise, utgRaiseValue);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === utg.self.id).inStreetAmount === utgRaiseValue)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              hasInitiative: true,
              inStreetAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            btn: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
            },
          }, 'after utg');

          btn.play(Decision.Fold, null);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === btn.self.id).hasFolded)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
              inStreetAmount: table.options.sb,
              bank: table.options.initBank - table.options.sb,
            },
            bb: {
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              hasInitiative: true,
              inStreetAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after btn');

          sb.play(Decision.Call, utgRaiseValue - table.options.sb);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === sb.self.id).inStreetAmount === utgRaiseValue)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              inStreetAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            bb: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
              inStreetAmount: table.options.sb * 2,
              bank: table.options.initBank - table.options.sb * 2,
            },
            utg: {
              hasInitiative: true,
              inStreetAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after sb 2');

          const bbRaiseValue = utgRaiseValue * 2;

          bb.play(Decision.Raise, bbRaiseValue - table.options.sb * 2);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === bb.self.id).inStreetAmount === bbRaiseValue)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              inStreetAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            bb: {
              hasInitiative: true,
              inStreetAmount: bbRaiseValue,
              bank: table.options.initBank - bbRaiseValue,
            },
            utg: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
              inStreetAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after bb 2');

          utg.play(Decision.Call, bbRaiseValue - utgRaiseValue);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === utg.self.id).inStreetAmount === bbRaiseValue)).toBeTrue();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              isTurn: true,
              availableDecisions: [Decision.Call, Decision.Fold, Decision.Raise],
              inStreetAmount: utgRaiseValue,
              bank: table.options.initBank - utgRaiseValue,
            },
            bb: {
              hasInitiative: true,
              inStreetAmount: bbRaiseValue,
              bank: table.options.initBank - bbRaiseValue,
            },
            utg: {
              inStreetAmount: bbRaiseValue,
              bank: table.options.initBank - bbRaiseValue,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after utg 2');

          sb.play(Decision.Call, bbRaiseValue - utgRaiseValue);

          await waitFor(() => {
            expect(clients.every(c => c.table.players.find(p => p.id === sb.self.id).isTurn)).toBeTrue();
            expect(table.street).toBe(Street.Flop);
            expect(table.board.flop1).not.toBeNull();
            expect(table.board.flop2).not.toBeNull();
            expect(table.board.flop3).not.toBeNull();
          });

          expectTurnAdvanced(clients, table, {
            sb: {
              isTurn: true,
              availableDecisions: [Decision.Bet, Decision.Fold, Decision.Check],
              inPotAmount: bbRaiseValue,
              bank: table.options.initBank - bbRaiseValue,
            },
            bb: {
              inPotAmount: bbRaiseValue,
              bank: table.options.initBank - bbRaiseValue,
            },
            utg: {
              inPotAmount: bbRaiseValue,
              bank: table.options.initBank - bbRaiseValue,
            },
            btn: {
              hasFolded: true,
            },
          }, 'after sb 3');
        });
      });
    });
  });
});

