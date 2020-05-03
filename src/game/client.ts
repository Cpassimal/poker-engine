import { Decision, ICard, IPlay, IPlayer, ITable, IUser } from '../tools/interfaces';
import { Subject } from 'rxjs';
import ioClient from "socket.io-client";
import { Events } from '../socket';

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

    this._ioClient.on(Events.Table, (body: ITable) => {
      this._table = body;
    });

    this._ioClient.on(Events.GameStart, (body: ITable) => {
      this._table = body;
    });

    this._ioClient.on(Events.NewPlayer, (body: IPlayer) => {
      this._newPlayer$.next(body);
    });

    this._newPlayer$.subscribe(b => {
      return this._table.players.push(b);
    })
  }

  public init(): Promise<void> {
    return new Promise((res, rej) => {
      this._ioClient.on(Events.Connected, async (user: IUser) => {
        this._self = user;

        res();
      });
    });
  }

  public join(
    tableId: string,
  ): void {
    this._ioClient.emit(Events.Join, {
      player: this._self,
      tableId,
    });
  }

  public start(): void {
    this._ioClient.emit(Events.Start, {
      player: this._self,
      tableId: this._table.id,
    });
  }

  public play(decision: Decision, value: number): void {
    this._ioClient.emit(Events.Play, {
      tableId: this._table.id,
      play: {
        decision,
        value,
      },
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

  public get position(): number {
    return this.self?.position;
  }

  public get table(): ITable {
    return this._table;
  }

  public get availableDecisions(): Decision[] {
    return this.self?.availableDecisions;
  }
}
