import express from 'express';

import * as bodyParser from 'body-parser';
import { createTable, initTable, makePlay, sitToTable } from './game/game';
import { tables } from './tools/data';
import { getTableForClient } from './tools/helper';
import { IPlay } from './tools/interfaces';

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

  res.send(getTableForClient(table));
});

app.post('/game/:gameId/sit', (req, res) => {
  const body = req.body;
  const gameId = req.params.gameId;
  const playerId = body.playerId;

  const table = sitToTable(gameId, playerId);

  res.send(getTableForClient(table));
});

app.get('/game/:gameId', (req, res) => {
  const gameId = req.params.gameId;
  const table = tables.find(t => t.id === gameId);

  if (!table) {
    return res.sendStatus(404);
  }

  res.send(getTableForClient(table));
});

app.post('/game/:gameId/play', (req, res) => {
  const body = req.body;
  const gameId = req.params[0];

  const play: IPlay = {
    gameId,
    playerId: body.playerId,
    decision: body.decision,
    value: body.value,
  };

  makePlay(play);

  res.send();
});

export { app };
