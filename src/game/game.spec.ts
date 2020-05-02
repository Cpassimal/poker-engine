import axios from 'axios';
import ioClient from 'socket.io-client';
import { Server as WsServer } from 'socket.io';
import { Server } from 'http';
import { initServer } from '../init';
import { IPlayer } from '../tools/interfaces';
import { Subject } from 'rxjs';
import { Client } from './client';
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
        return client.players.some(p => p.id === client.self.id);
      });

      return client;
    }),
  );
}

export function waitFor(
  predicate: () => boolean,
  timeout: number = 1000,
): Promise<void> {
  const err = new Error(`expected ${predicate()} to be Truthy before ${timeout}ms`);

  return new Promise((res, rej) => {
    const timer = setTimeout(() => {
      const stack = err.stack.split('\n').filter(l => !l.match(/()+at waitFor/));
      err.stack = stack.join('\n');

      // res();
      rej(err);
    }, timeout);

    const interval = setInterval(() => {
      const ret = predicate();

      if (ret) {
        clearTimeout(timer);
        clearInterval(interval);
        res();
      }
    }, 10);
  });
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
          return client1.players.length === 1 && client2.players.length === 0;
        });

        expect(client1.players).toEqual([jasmine.objectContaining({ id: client1.self.id })]);
        expect(client2.players).toEqual([]);
        expect(client3.players).toEqual([]);

        client2.join(tableId);

        await waitFor(() => {
          return client1.players.length === 2 && client2.players.length === 2;
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
          return client1.players.length === 3
            && client2.players.length === 3
            && client3.players.length === 3;
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

    describe('dealCards', () => {
      it('should start', async () => {
        const clients = await generateClients(4, tableId);

        const leader = clients.find(c => c.isLeader);

        leader.start();

        await waitFor(() => {
          return clients.every(c => c.cards.length === 2);
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
      });
    });
  });
});
