import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { CollectionItem } from '../models/collection.model';

export interface CollectionCreatePayload {
  id_game: string;
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
export class CollectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/collection`;

  list(): Observable<ApiResponse<CollectionItem[]>> {
    return this.http.get<ApiResponse<CollectionItem[]>>(this.baseUrl);
  }

  // Ajout direct depuis le Catalogue (§3.3) : pas de transfert wishlist, juste une nouvelle entrée.
  create(payload: CollectionCreatePayload): Observable<ApiResponse<CollectionItem>> {
    return this.http.post<ApiResponse<CollectionItem>>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<CollectionCreatePayload>): Observable<ApiResponse<CollectionItem>> {
    return this.http.put<ApiResponse<CollectionItem>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
