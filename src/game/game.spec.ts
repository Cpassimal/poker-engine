import axios from 'axios';
import io from 'socket.io';
import ioClient from 'socket.io-client';
import { Server } from 'http';

import { player1, player2, player3, player4 } from '../tools/data';
import { initServer } from '../init';

let server: Server;
let client1;
const port = 5000;
const baseUrl = `http://localhost:${port}`;
const wsUrl = `ws://localhost:${port}`;

fdescribe('game', () => {
  beforeAll(async (done) => {
    const ret = initServer(port);
    server = ret.server;

    client1 = ioClient(wsUrl);
    client1.connect();

    done();
  });

  afterAll((done) => {
    client1.disconnect();
    server.close(done);
  });

  describe('initTable', () => {
    it('POST /game/init', async (done) => {
      const players = [player1, player2, player3, player4];

      const response = await axios.post(
        baseUrl + '/game/init',
        {
          players,
          options: {
            sb: 10,
            timer: 60,
            initBank: 1000,
          }
        },
      );

      expect(response).toBeDefined();
      expect(response.status).toBe(200);

      const content = response.data;

      expect(content.id).toBeDefined();
      expect(content.board).toBeDefined();
      expect(content.players).toBeDefined();
      expect(content.deck).toBeUndefined();

      done();
    });
  });

  describe('wss', () => {
    it('emit message', (done) => {
      // const hasEmitted = webSocket.emit('message', 'toto');

      expect(true).toBeTrue();

      done()
    });
  });
});
