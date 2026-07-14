import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { ConsoleWishlistItem } from '../models/console-wishlist.model';
import { ConsoleCollectionItem } from '../models/console-collection.model';
import { ConsoleCollectionFormPayload } from './console-collection.service';
import { WishlistStatus } from '../constants/wishlist-status.constants';

export interface ConsoleWishlistCreatePayload {
  id_console: string;
  ll_desired_video_standard: string | null;
  ts_last_checked: string | null;
}

export type ConsoleBuyPayload = Omit<ConsoleCollectionFormPayload, 'id_console'>;

@Injectable({ providedIn: 'root' })
export class ConsoleWishlistService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/consoles/wishlist`;

  list(): Observable<ApiResponse<ConsoleWishlistItem[]>> {
    return this.http.get<ApiResponse<ConsoleWishlistItem[]>>(this.baseUrl);
  }

  create(payload: ConsoleWishlistCreatePayload): Observable<ApiResponse<ConsoleWishlistItem>> {
    return this.http.post<ApiResponse<ConsoleWishlistItem>>(this.baseUrl, payload);
  }

  update(
    id: string,
    payload: Partial<Omit<ConsoleWishlistCreatePayload, 'id_console'>> & { ll_status?: WishlistStatus }
  ): Observable<ApiResponse<ConsoleWishlistItem>> {
    return this.http.put<ApiResponse<ConsoleWishlistItem>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  // Bouton "Acheter" (§3.2/§3.5) : transfère la console de la wishlist vers la collection.
  buy(id: string, payload: ConsoleBuyPayload): Observable<ApiResponse<ConsoleCollectionItem>> {
    return this.http.post<ApiResponse<ConsoleCollectionItem>>(`${this.baseUrl}/${id}/buy`, payload);
  }
}
