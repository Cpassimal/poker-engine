import axios from 'axios';
import { Server as WsServer } from 'socket.io';
import { Server } from 'http';
import { initServer } from '../init';
import { Client } from './client';
import { Decision, Street } from '../tools/interfaces';
import { tables } from '../tools/data';

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

export function expectTurn(clients: Client[], testee: Client): void {
  for (const client of clients) {
    for (const player of client.players) {
      if (player.id === testee.self.id) {
        expect(player.isTurn).toBeTrue();
      } else {
        expect(player.isTurn).toBeFalse();
      }
    }
  }
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
      expect(content.board).toBeUndefined();
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
      expect(content.board).toBeUndefined();
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
      it('should play', async () => {
        const clients = await generateClients(4, tableId);

        const leader = clients.find(c => c.isLeader);

        leader.start();

        await waitFor(() => {
          expect(clients.every(c => c.cards.length === 2)).toBeTrue();
          expect(clients.every(c => c.position)).toBeTruthy();
        });

        for (const client of clients) {
          for (const player of client.players) {
            if (player.id === client.self.id) {
              expect(player.cards.length).toBe(2);
            } else {
              expect(player.cards.length).toBe(0);
            }
          }
        }

        const table = tables.find(t => t.id === tableId);

        expect(table.street).toBe(Street.PreFlop);
        expect(clients.every(c => c.table.turnNumber === 0)).toBeTrue();

        const sb = clients.find(c => c.position === 1);

        expectTurn(clients, sb);

        sb.play(Decision.Bet, null);

        await waitFor(() => {
          expect(clients.every(c => c.table.players.find(p => p.id === sb.self.id).inStreetAmount === table.options.sb)).toBeTrue();
        });

        const bb = clients.find(c => c.position === 2);

        expectTurn(clients, bb);

        bb.play(Decision.Bet, null);

        await waitFor(() => {
          expect(clients.every(c => c.table.players.find(p => p.id === bb.self.id).inStreetAmount === table.options.sb * 2)).toBeTrue();
        });

        const utg = clients.find(c => c.position === 3);

        expectTurn(clients, utg);

        expect(utg.availableDecisions.sort()).toEqual([Decision.Call, Decision.Fold, Decision.Raise]);
      });
    });
  });
});
