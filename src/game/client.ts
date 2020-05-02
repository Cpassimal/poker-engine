import { ICard, IPlayer, ITable, IUser } from '../tools/interfaces';
import { Subject } from 'rxjs';
import ioClient from "socket.io-client";

export class Client {
  private _self: IUser;
  private _ioClient: SocketIOClient.Socket;
  private _table: ITable;

  private _newPlayer$: Subject<IPlayer>;

  constructor(
    wsUrl: string,
  ) {
    this._ioClient = ioClient(wsUrl);
    this._newPlayer$ = new Subject<IPlayer>();

    this._ioClient.on('table', (body: ITable) => {
      this._table = body;
    });

    this._ioClient.on('game-start', (body: ITable) => {
      this._table = body;
    });

    this._ioClient.on('new-player', (body: IPlayer) => {
      this._newPlayer$.next(body);
    });

    this._newPlayer$.subscribe(b => {
      return this._table.players.push(b);
    })
  }

  public init(): Promise<void> {
    return new Promise((res, rej) => {
      this._ioClient.on('connected', async (user: IUser) => {
        this._self = user;

        res();
      });
    });
  }

  public join(
    tableId: string,
  ): void {
    this._ioClient.emit('join', {
      player: this._self,
      tableId,
    });
  }

  public start(): void {
    this._ioClient.emit('start', {
      player: this._self,
      tableId: this._table.id,
    });
  }

  public get self(): IPlayer {
    return this.players.find(p => p.id === this._self.id);
  }

  public get players(): IPlayer[] {
    return this._table?.players || [];
  }

  public get isLeader(): boolean {
    return this.self?.isLeader;
  }

  public get cards(): ICard[] {
    return this.self?.cards || [];
  }
}
