import express from 'express';

import * as bodyParser from 'body-parser';
import { createTable, sitToTable } from './game/game';
import { tables } from './tools/data';
import { getTableForClient } from './tools/helper';

/**
 * Server
 */
const app = express();

app.use(bodyParser.json({
  limit: '50mb',
  verify(req: any, res, buf, encoding) {
    req.rawBody = buf;
  },
}));

/**
 * ROUTES
 */
app.post('/game/init', (req, res) => {
  const body = req.body;
  const table = createTable(body.options);
  tables.push(table);

  res.send(getTableForClient(table, null));
});

app.post('/game/:gameId/sit', (req, res) => {
  const body = req.body;
  const gameId = req.params.gameId;
  const playerId = body.playerId;

  const table = sitToTable(gameId, playerId);

  res.send(getTableForClient(table, null));
});

export { app };
