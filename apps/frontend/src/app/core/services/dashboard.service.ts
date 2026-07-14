import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { ActivityKind, ActivityLogPage, DashboardData } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/dashboard`;

  get(): Observable<ApiResponse<DashboardData>> {
    return this.http.get<ApiResponse<DashboardData>>(this.baseUrl);
  }

  getActivity(kind: ActivityKind | 'all', limit: number, offset: number): Observable<ApiResponse<ActivityLogPage>> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    if (kind !== 'all') params = params.set('kind', kind);
    return this.http.get<ApiResponse<ActivityLogPage>>(`${this.baseUrl}/activity`, { params });
  }
}
