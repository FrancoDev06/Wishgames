import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { OfferItem, OfferFormValue } from '../../shared/components/offers-panel/offers-panel';

@Injectable({ providedIn: 'root' })
export class ConsoleWishlistOfferService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/consoles/wishlist`;

  list(idConsoleWishlist: string): Observable<ApiResponse<OfferItem[]>> {
    return this.http.get<ApiResponse<OfferItem[]>>(`${this.baseUrl}/${idConsoleWishlist}/offers`);
  }

  create(idConsoleWishlist: string, payload: OfferFormValue): Observable<ApiResponse<OfferItem>> {
    return this.http.post<ApiResponse<OfferItem>>(`${this.baseUrl}/${idConsoleWishlist}/offers`, payload);
  }

  update(offerId: string, payload: OfferFormValue): Observable<ApiResponse<OfferItem>> {
    return this.http.put<ApiResponse<OfferItem>>(`${this.baseUrl}/offers/${offerId}`, payload);
  }

  delete(offerId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/offers/${offerId}`);
  }
}
