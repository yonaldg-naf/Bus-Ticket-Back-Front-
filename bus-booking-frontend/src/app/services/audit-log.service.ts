import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditLogEntry {
  id: string;
  logType: 'Audit' | 'Error';
  action: string;
  description: string;
  detail?: string;
  username?: string;
  userRole?: string;
  entityType?: string;
  entityId?: string;
  httpMethod?: string;
  endpoint?: string;
  statusCode?: number;
  durationMs?: number;
  isSuccess: boolean;
  createdAtUtc: string;
}

export interface PagedAuditLogResult {
  items: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditLogQuery {
  logType?: string;
  username?: string;
  entityType?: string;
  isSuccess?: boolean;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auditlogs`;

  getLogs(query: AuditLogQuery = {}): Observable<PagedAuditLogResult> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 25));

    if (query.logType)   params = params.set('logType',    query.logType);
    if (query.username)  params = params.set('username',   query.username);
    if (query.entityType) params = params.set('entityType', query.entityType);
    if (query.isSuccess !== undefined) params = params.set('isSuccess', String(query.isSuccess));
    if (query.from) params = params.set('from', query.from);
    if (query.to)   params = params.set('to',   query.to);

    return this.http.get<PagedAuditLogResult>(this.base, { params });
  }
}