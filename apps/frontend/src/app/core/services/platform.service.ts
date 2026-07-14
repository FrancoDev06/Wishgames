import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { ConsoleOption } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/platforms`;

  list(): Observable<ApiResponse<ConsoleOption[]>> {
    return this.http.get<ApiResponse<ConsoleOption[]>>(this.baseUrl);
  }
}
