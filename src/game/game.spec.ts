import axios from 'axios';
import ioClient from 'socket.io-client';
import { Server as WsServer } from 'socket.io';
import { Server } from 'http';
import { initServer } from '../init';
import { IPlayer } from '../tools/interfaces';

let server: Server;
let wss: WsServer;
let client1;
const port = 5000;
const baseUrl = `http://localhost:${port}`;
const wsUrl = `ws://localhost:${port}`;

fdescribe('game', () => {
  beforeAll(async (done) => {
    const ret = initServer(port);
    server = ret.server;
    wss = ret.wss;

    done();
  });

  afterAll(async (done) => {
    client1.disconnect();

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


  describe('initTable', () => {
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
      it('should add player to table', (done) => {
        client1 = ioClient(wsUrl);
        client1.on('new-player', (body) => {
          console.log('1 new-player body', body);
        });
        client1.on('connected', async (player: IPlayer) => {
          client1.emit('join', {
            playerId: player.id,
            tableId,
          });

          const table = await axios.get(
            baseUrl + '/game/' + tableId,
          );

          expect(table.data.players.length).toBe(1);

          done();
        });
        const client2 = ioClient(wsUrl);

        client2.on('connected', async (player: IPlayer) => {
          client2.emit('join', {
            playerId: player.id,
            tableId,
          });

          const table = await axios.get(
            baseUrl + '/game/' + tableId,
          );

          expect(table.data.players.length).toBe(2);

          done();
        });

        client2.on('new-player', (body) => {
          console.log('2 new-player body', body);
        });
      });
    });
  });
});
