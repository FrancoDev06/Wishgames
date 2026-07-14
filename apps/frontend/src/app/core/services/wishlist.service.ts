import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { WishlistItem } from '../models/wishlist.model';
import { CollectionItem } from '../models/collection.model';
import { WishlistStatus } from '../constants/wishlist-status.constants';

export interface WishlistCreatePayload {
  id_game: string;
  ll_desired_regions?: string[];
  ll_desired_completeness?: string | null;
  ll_desired_condition?: string | null;
  nb_priority?: number | null;
  ts_last_checked?: string | null;
}

export interface BuyPayload {
  ll_region?: string | null;
  ll_completeness: string;
  ll_condition_overall: string;
  ll_condition_media?: string | null;
  ll_condition_box?: string | null;
  ll_condition_manual?: string | null;
  nb_price_paid: number | null;
  ll_purchase_location: string | null;
  ts_acquired: string | null;
  nb_quantity: number;
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/wishlist`;

  list(): Observable<ApiResponse<WishlistItem[]>> {
    return this.http.get<ApiResponse<WishlistItem[]>>(this.baseUrl);
  }

  // Ajout depuis le Catalogue (§3.3/§6) : seul id_game est requis, le reste (critères de
  // recherche : régions/complétude/état désirés, priorité, dernière vérification) est optionnel.
  create(payload: WishlistCreatePayload): Observable<ApiResponse<WishlistItem>> {
    return this.http.post<ApiResponse<WishlistItem>>(this.baseUrl, payload);
  }

  // Bouton "Acheter" (§3.2) : transfère le jeu de la wishlist vers la collection.
  buy(id: string, payload: BuyPayload): Observable<ApiResponse<CollectionItem>> {
    return this.http.post<ApiResponse<CollectionItem>>(`${this.baseUrl}/${id}/buy`, payload);
  }

  update(
    id: string,
    payload: Partial<Omit<WishlistCreatePayload, 'id_game'>> & { ll_status?: WishlistStatus }
  ): Observable<ApiResponse<WishlistItem>> {
    return this.http.put<ApiResponse<WishlistItem>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
