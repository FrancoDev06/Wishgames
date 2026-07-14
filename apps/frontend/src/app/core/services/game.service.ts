import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { GameListItem } from '../models/game.model';

export type GameStatusFilter = 'collection' | 'wishlist' | 'none';

export interface GameListParams {
  console?: string;
  status?: GameStatusFilter;
  search?: string;
  limit: number;
  offset: number;
}

export interface GameListResponse {
  info: string;
  data: GameListItem[];
  additional: { total: number; limit: number; offset: number };
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/games`;

  list(params: GameListParams): Observable<GameListResponse> {
    const query: Record<string, string> = {
      limit: String(params.limit),
      offset: String(params.offset),
    };
    if (params.console) query['console'] = params.console;
    if (params.status) query['status'] = params.status;
    if (params.search) query['search'] = params.search;

    return this.http.get<GameListResponse>(this.baseUrl, { params: query });
  }
}
