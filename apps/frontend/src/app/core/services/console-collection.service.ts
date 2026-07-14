import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { ConsoleCollectionItem } from '../models/console-collection.model';

export interface ConsoleCollectionFormPayload {
  id_console: string;
  nb_quantity: number;
  ll_completeness: string;
  ll_condition_overall: string;
  ll_video_standard: string | null;
  flag_with_cables: boolean;
  flag_with_controller: boolean;
  ts_acquired: string | null;
  nb_price_paid: number | null;
  ll_purchase_location: string | null;
  ll_notes: string | null;
}

@Injectable({ providedIn: 'root' })
export class ConsoleCollectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/consoles/collection`;

  list(): Observable<ApiResponse<ConsoleCollectionItem[]>> {
    return this.http.get<ApiResponse<ConsoleCollectionItem[]>>(this.baseUrl);
  }

  create(payload: ConsoleCollectionFormPayload): Observable<ApiResponse<ConsoleCollectionItem>> {
    return this.http.post<ApiResponse<ConsoleCollectionItem>>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Omit<ConsoleCollectionFormPayload, 'id_console'>>): Observable<ApiResponse<ConsoleCollectionItem>> {
    return this.http.put<ApiResponse<ConsoleCollectionItem>>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
